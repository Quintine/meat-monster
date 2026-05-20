import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// API Routes

// Fetch all data (Stock, Orders, Config)
app.get('/api/data', async (req, res) => {
  try {
    const stock = await prisma.stockItem.findMany();
    const orders = await prisma.order.findMany();
    const config = await prisma.config.findFirst();
    
    // Parse order items from string to JSON
    const parsedOrders = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));

    res.json({ stock, orders: parsedOrders, config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Submit a new order
app.post('/api/orders', async (req, res) => {
  try {
    const { name, phone, items, totalWeight, estimatedTotal } = req.body;
    
    // Generate simple order number
    const lastOrder = await prisma.order.findFirst({ orderBy: { id: 'desc' } });
    const nextId = (lastOrder?.id || 0) + 1;
    const orderNumber = `#${nextId + 1000}`;

    const order = await prisma.order.create({
      data: {
        orderNumber,
        name,
        phone,
        totalWeight,
        estimatedTotal,
        items: JSON.stringify(items),
        status: 'Pending'
      }
    });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit order' });
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
    const item = req.body;
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
    const { adminCode, finalDepositDate, cookDay, payIdInfo } = req.body;
    const config = await prisma.config.findFirst();
    const data: any = {};
    if (adminCode !== undefined) data.adminCode = adminCode;
    if (finalDepositDate !== undefined) data.finalDepositDate = finalDepositDate;
    if (cookDay !== undefined) data.cookDay = cookDay;
    if (payIdInfo !== undefined) data.payIdInfo = payIdInfo;

    if (config) {
      await prisma.config.update({
        where: { id: config.id },
        data
      });
    } else {
      await prisma.config.create({ data });
    }
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// Reset Database to defaults
app.post('/api/reset', async (req, res) => {
  try {
    await prisma.order.deleteMany();
    await prisma.stockItem.deleteMany();
    await prisma.config.deleteMany();
    
    // Seed default admin code
    await prisma.config.create({ data: { adminCode: '1234' } });
    
    // Seed some default stock items
    await prisma.stockItem.createMany({
      data: [
        { name: 'Beef Brisket', category: 'Beef', price: 45, unit: 'kg', description: 'Low and slow smoked brisket', available: true },
        { name: 'Pork Shoulder', category: 'Pork', price: 35, unit: 'kg', description: 'Pulled pork perfection', available: true }
      ]
    });
    
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

// Serve Static Files in Production
const frontendPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendPath));

app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
