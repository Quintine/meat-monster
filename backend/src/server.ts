import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes

// Fetch all data (Stock, Orders, Config, FAQs)
app.get('/api/data', async (req, res) => {
  try {
    let stock = await prisma.stockItem.findMany();
    const orders = await prisma.order.findMany();
    const config = await prisma.config.findFirst();
    const faqs = await prisma.fAQ.findMany({ orderBy: { order: 'asc' } });
    
    // Parse order items from string to JSON
    const parsedOrders = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));

    // Tally total ordered kg per stock item across all orders
    const orderedQtyById: Record<number, number> = {};
    for (const order of parsedOrders) {
      for (const item of order.items) {
        orderedQtyById[item.id] = (orderedQtyById[item.id] || 0) + (item.qty || 0);
      }
    }

    // Auto-deactivate items that have hit their maxStock limit
    for (const item of stock) {
      if (item.maxStock !== null && item.maxStock !== undefined) {
        const ordered = orderedQtyById[item.id] || 0;
        const isOutOfStock = ordered >= item.maxStock;
        // Only auto-disable if it's currently marked as available but is actually out of stock
        if (isOutOfStock && item.available) {
          await prisma.stockItem.update({
            where: { id: item.id },
            data: { available: false }
          });
        }
      }
    }

    // Re-fetch stock after potential auto-updates
    stock = await prisma.stockItem.findMany();

    // Attach remaining stock info to each item
    const stockWithRemaining = stock.map(item => ({
      ...item,
      orderedQty: orderedQtyById[item.id] || 0,
      remainingStock: item.maxStock !== null && item.maxStock !== undefined
        ? Math.max(0, item.maxStock - (orderedQtyById[item.id] || 0))
        : null
    }));

    // Security: Don't send the admin code to the client
    const configResponse = config ? { ...config, adminCode: undefined } : null;

    res.json({ stock: stockWithRemaining, orders: parsedOrders, config: configResponse, faqs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Admin Login
app.post('/api/login', async (req, res) => {
  try {
    const { code } = req.body;
    console.log(`Login attempt with code: ${code}`);
    const config = await prisma.config.findFirst();
    if (config && config.adminCode === code) {
      console.log('Login successful');
      res.json({ success: true });
    } else {
      console.log(`Login failed. Expected: ${config?.adminCode}, Got: ${code}`);
      res.status(401).json({ error: 'Invalid admin code' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Submit a new order
app.post('/api/orders', async (req, res) => {
  try {
    const { name, phone, items, totalWeight, estimatedTotal } = req.body;
    
    // 1. Validate Stock Availability
    const stockItems = await prisma.stockItem.findMany();
    const allOrders = await prisma.order.findMany();
    
    const orderedQtyById: Record<number, number> = {};
    for (const order of allOrders) {
      const parsedItems = JSON.parse(order.items);
      for (const item of parsedItems) {
        orderedQtyById[item.id] = (orderedQtyById[item.id] || 0) + (item.qty || 0);
      }
    }

    let computedTotalWeight = 0;
    let computedEstimatedTotal = 0;

    for (const item of items) {
      const dbItem = stockItems.find(s => s.id === item.id);
      if (!dbItem) throw new Error(`Item ${item.name} not found`);
      if (!dbItem.available) throw new Error(`Sorry, ${dbItem.name} has just sold out!`);
      
      if (dbItem.maxStock !== null && dbItem.maxStock !== undefined) {
        const alreadyOrdered = orderedQtyById[dbItem.id] || 0;
        if (alreadyOrdered + item.qty > dbItem.maxStock) {
          throw new Error(`Not enough stock for ${dbItem.name}. Only ${Math.max(0, dbItem.maxStock - alreadyOrdered)}${dbItem.unit} remaining.`);
        }
      }

      // Recalculate prices server-side
      const getPrice = (stockItem: any, qty: number) => {
        if (stockItem.bulk2Threshold > 0 && qty >= stockItem.bulk2Threshold && stockItem.bulk2Price > 0) return stockItem.bulk2Price;
        if (stockItem.bulk1Threshold > 0 && qty >= stockItem.bulk1Threshold && stockItem.bulk1Price > 0) return stockItem.bulk1Price;
        return stockItem.price;
      };

      const finalPrice = getPrice(dbItem, item.qty);
      item.finalPricePerUnit = finalPrice;
      item.lineTotal = finalPrice * item.qty;
      
      computedTotalWeight += item.qty;
      computedEstimatedTotal += item.lineTotal;
    }

    // 2. Create the order
    const order = await prisma.order.create({
      data: {
        name,
        phone,
        totalWeight: computedTotalWeight,
        estimatedTotal: computedEstimatedTotal,
        items: JSON.stringify(items),
        status: 'Pending'
      }
    });

    // 3. Generate and update order number based on ID (to avoid race conditions)
    const orderNumber = `#${order.id + 1000}`;
    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: { orderNumber }
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to submit order' });
  }
});

// Update Order Status
app.patch('/api/orders/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const order = await prisma.order.update({
      where: { id: parseInt(id) },
      data: { status }
    });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete an order
app.delete('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.order.delete({ where: { id: parseInt(id) } });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Clear all orders
app.delete('/api/orders', async (req, res) => {
  try {
    await prisma.order.deleteMany();
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to clear orders' });
  }
});

// Update or Create Stock Item
app.post('/api/stock', async (req, res) => {
  try {
    const { orderedQty, remainingStock, ...item } = req.body; // strip virtual fields
    if (item.id) {
      const updated = await prisma.stockItem.update({
        where: { id: item.id },
        data: {
          ...item,
          id: undefined // Don't update ID
        }
      });
      res.json(updated);
    } else {
      const created = await prisma.stockItem.create({ data: item });
      res.json(created);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update stock' });
  }
});

// Delete Stock Item
app.delete('/api/stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.stockItem.delete({ where: { id: parseInt(id) } });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete stock item' });
  }
});

// Update Config
app.post('/api/config', async (req, res) => {
  try {
    const { adminCode, finalDepositDate, cookDay, payIdInfo, termsOfService, orderingPolicy, depositPercentage } = req.body;
    const data: any = {};
    if (adminCode !== undefined) data.adminCode = adminCode;
    if (finalDepositDate !== undefined) data.finalDepositDate = finalDepositDate;
    if (cookDay !== undefined) data.cookDay = cookDay;
    if (payIdInfo !== undefined) data.payIdInfo = payIdInfo;
    if (termsOfService !== undefined) data.termsOfService = termsOfService;
    if (orderingPolicy !== undefined) data.orderingPolicy = orderingPolicy;
    if (depositPercentage !== undefined) data.depositPercentage = parseInt(depositPercentage);

    // Use upsert to ensure we always use ID 1
    await prisma.config.upsert({
      where: { id: 1 },
      update: data,
      create: { ...data, id: 1 }
    });
    
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Update or Create FAQ Item
app.post('/api/faqs', async (req, res) => {
  try {
    const item = req.body;
    if (item.id) {
      const updated = await prisma.fAQ.update({
        where: { id: item.id },
        data: {
          ...item,
          id: undefined // Don't update ID
        }
      });
      res.json(updated);
    } else {
      const created = await prisma.fAQ.create({ data: item });
      res.json(created);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update FAQ' });
  }
});

// Delete FAQ Item
app.delete('/api/faqs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.fAQ.delete({ where: { id: parseInt(id) } });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete FAQ item' });
  }
});

// Reset Database to defaults
app.post('/api/reset', async (req, res) => {
  try {
    await prisma.order.deleteMany();
    await prisma.stockItem.deleteMany();
    await prisma.config.deleteMany();
    await prisma.fAQ.deleteMany();
    
    // Seed default admin code and limits with ID 1
    await prisma.config.create({ 
      data: { 
        id: 1,
        adminCode: '1234', 
        payIdInfo: 'Your PayID Here',
        termsOfService: 'To secure your order, a 30% non-refundable deposit is required upfront before smoking begins. Payments can be made via PayID or Cash. The remaining balance is payable upon pickup.',
        orderingPolicy: 'Deposits cover material costs and are final. PayID details provided after ordering.',
        depositPercentage: 30
      } 
    });
    
    // Seed some default stock items
    await prisma.stockItem.createMany({
      data: [
        { name: 'Beef Brisket', category: 'Beef', price: 45, unit: 'kg', description: 'Low and slow smoked brisket', available: true },
        { name: 'Pork Shoulder', category: 'Pork', price: 35, unit: 'kg', description: 'Pulled pork perfection', available: true }
      ]
    });

    // Seed some default FAQs
    await prisma.fAQ.createMany({
      data: [
        { question: 'When is pickup?', answer: 'Pickups are usually scheduled for the afternoon of the Cook Day. We will contact you to confirm the exact time.', order: 1 },
        { question: 'How do I pay the deposit?', answer: 'Once you submit your order, you can pay the 30% deposit via PayID or Cash.', order: 2 }
      ]
    });
    
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Serve Static Files in Production
const frontendPath = fs.existsSync(path.join(__dirname, '../frontend-dist'))
  ? path.join(__dirname, '../frontend-dist')
  : path.join(__dirname, '../../frontend/dist');

app.use(express.static(frontendPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, async () => {
  // Ensure a default config exists
  const config = await prisma.config.findFirst();
  if (!config) {
    await prisma.config.create({
      data: {
        id: 1,
        adminCode: '1234',
        payIdInfo: 'Your PayID Here'
      }
    });
    console.log('Default config seeded');
  }
  console.log(`Server is running on http://localhost:${PORT}`);
});
