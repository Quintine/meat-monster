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

const requireAdmin: express.RequestHandler = async (req, res, next) => {
  try {
    const adminCode = req.get('x-admin-code');
    const config = await prisma.config.findUnique({ where: { id: 1 } });

    if (!adminCode || !config || adminCode !== config.adminCode) {
      res.status(401).json({ error: 'Admin authentication required' });
      return;
    }

    next();
  } catch (error) {
    console.error('Admin authentication failed:', error);
    res.status(500).json({ error: 'Failed to authenticate admin' });
  }
};

const parseId = (value: string | string[] | undefined) => {
  const id = Array.isArray(value) ? NaN : Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

// API Routes

// Fetch all data (Stock, Orders, Config, FAQs)
app.get('/api/data', async (req, res) => {
  try {
    const stock = await prisma.stockItem.findMany();
    const orders = await prisma.order.findMany();
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    const faqs = await prisma.fAQ.findMany({ orderBy: { order: 'asc' } });

    const suppliedAdminCode = req.get('x-admin-code');
    const isAdmin = Boolean(suppliedAdminCode && config && suppliedAdminCode === config.adminCode);
    if (suppliedAdminCode && !isAdmin) {
      res.status(401).json({ error: 'Admin session expired' });
      return;
    }
    
    // Parse order items from string to JSON
    const parsedOrders = orders.map(order => ({
      ...order,
      items: JSON.parse(order.items)
    }));

    // Tally total ordered kg per stock item across all orders
    const orderedQtyById: Record<number, number> = {};
    for (const order of parsedOrders) {
      if (order.status === 'Cancelled') continue;
      for (const item of order.items) {
        orderedQtyById[item.id] = (orderedQtyById[item.id] || 0) + (item.qty || 0);
      }
    }

    // Attach computed batch availability without overwriting the admin's availability setting
    const stockWithRemaining = stock.map(item => {
      const orderedQty = orderedQtyById[item.id] || 0;
      const remainingStock = item.maxStock !== null
        ? Math.max(0, item.maxStock - orderedQty)
        : null;

      return {
        ...item,
        available: item.available && (remainingStock === null || remainingStock > 0),
        configuredAvailable: item.available,
        orderedQty,
        remainingStock
      };
    });

    // Security: Don't send the admin code to the client
    const configResponse = config ? {
      id: config.id,
      finalDepositDate: config.finalDepositDate,
      cookDay: config.cookDay,
      payIdInfo: config.payIdInfo,
      termsOfService: config.termsOfService,
      orderingPolicy: config.orderingPolicy,
      depositPercentage: config.depositPercentage
    } : null;

    res.json({ stock: stockWithRemaining, orders: isAdmin ? parsedOrders : [], config: configResponse, faqs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Admin Login
app.post('/api/login', async (req, res) => {
  try {
    const { code } = req.body;
    const config = await prisma.config.findUnique({ where: { id: 1 } });
    if (config && config.adminCode === code) {
      res.json({ success: true });
    } else {
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
    const { name, phone, items } = req.body;

    if (typeof name !== 'string' || !name.trim() || typeof phone !== 'string' || !phone.trim()) {
      throw new Error('Name and phone are required');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('At least one item is required');
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const stockItems = await tx.stockItem.findMany();
      const allOrders = await tx.order.findMany({
        where: { status: { not: 'Cancelled' } },
        select: { items: true }
      });
      const orderedQtyById: Record<number, number> = {};

      for (const order of allOrders) {
        const parsedItems = JSON.parse(order.items);
        for (const item of parsedItems) {
          orderedQtyById[item.id] = (orderedQtyById[item.id] || 0) + (item.qty || 0);
        }
      }

      const seenItemIds = new Set<number>();
      const validatedItems: Array<{
        id: number;
        name: string;
        qty: number;
        unit: string;
        finalPricePerUnit: number;
        lineTotal: number;
      }> = [];
      let computedTotalWeight = 0;
      let computedEstimatedTotal = 0;

      for (const item of items) {
        if (!Number.isInteger(item?.id) || typeof item?.qty !== 'number' || !Number.isFinite(item.qty) || item.qty <= 0) {
          throw new Error('Each order item must have a valid item ID and quantity greater than zero');
        }
        if (seenItemIds.has(item.id)) {
          throw new Error('Duplicate items are not allowed');
        }
        seenItemIds.add(item.id);

        const dbItem = stockItems.find(stockItem => stockItem.id === item.id);
        if (!dbItem) throw new Error('An item in this order no longer exists');
        if (!dbItem.available) throw new Error(`Sorry, ${dbItem.name} has just sold out!`);

        if (dbItem.maxStock !== null) {
          const alreadyOrdered = orderedQtyById[dbItem.id] || 0;
          if (alreadyOrdered + item.qty > dbItem.maxStock) {
            throw new Error(`Not enough stock for ${dbItem.name}. Only ${Math.max(0, dbItem.maxStock - alreadyOrdered)}${dbItem.unit} remaining.`);
          }
        }

        let finalPrice = dbItem.price;
        if (dbItem.bulk2Threshold > 0 && item.qty >= dbItem.bulk2Threshold && dbItem.bulk2Price > 0) {
          finalPrice = dbItem.bulk2Price;
        } else if (dbItem.bulk1Threshold > 0 && item.qty >= dbItem.bulk1Threshold && dbItem.bulk1Price > 0) {
          finalPrice = dbItem.bulk1Price;
        }

        const lineTotal = finalPrice * item.qty;
        validatedItems.push({
          id: dbItem.id,
          name: dbItem.name,
          qty: item.qty,
          unit: dbItem.unit,
          finalPricePerUnit: finalPrice,
          lineTotal
        });
        computedTotalWeight += item.qty;
        computedEstimatedTotal += lineTotal;
      }

      const order = await tx.order.create({
        data: {
          name: name.trim(),
          phone: phone.trim(),
          totalWeight: computedTotalWeight,
          estimatedTotal: computedEstimatedTotal,
          items: JSON.stringify(validatedItems),
          status: 'Pending'
        }
      });

      return tx.order.update({
        where: { id: order.id },
        data: { orderNumber: `#${order.id + 1000}` }
      });
    });

    res.json(updatedOrder);
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message || 'Failed to submit order' });
  }
});

// Update Order Status
app.patch('/api/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const orderId = parseId(id);
    const allowedStatuses = ['Pending', 'Deposit Paid', 'Paid', 'Cooked', 'Completed', 'Cancelled'];
    if (orderId === null) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid order status' });
      return;
    }
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status }
    });
    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Delete an order
app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const orderId = parseId(id);
    if (orderId === null) {
      res.status(400).json({ error: 'Invalid order ID' });
      return;
    }
    await prisma.order.delete({ where: { id: orderId } });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete order' });
  }
});

// Start a fresh cooking batch while preserving the menu and site settings
app.post('/api/batches/reset', requireAdmin, async (req, res) => {
  try {
    const [clearedOrders, reactivatedItems] = await prisma.$transaction([
      prisma.order.deleteMany(),
      prisma.stockItem.updateMany({
        where: { available: false },
        data: { available: true }
      })
    ]);

    res.json({
      clearedOrders: clearedOrders.count,
      reactivatedItems: reactivatedItems.count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to start a new cooking batch' });
  }
});

// Update or Create Stock Item
app.post('/api/stock', requireAdmin, async (req, res) => {
  try {
    const { orderedQty, remainingStock, configuredAvailable, ...item } = req.body; // strip virtual fields
    if (typeof configuredAvailable === 'boolean') {
      item.available = configuredAvailable;
    }
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
app.delete('/api/stock/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const stockItemId = parseId(id);
    if (stockItemId === null) {
      res.status(400).json({ error: 'Invalid stock item ID' });
      return;
    }
    await prisma.stockItem.delete({ where: { id: stockItemId } });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete stock item' });
  }
});

// Update Config
app.post('/api/config', requireAdmin, async (req, res) => {
  try {
    const { adminCode, finalDepositDate, cookDay, payIdInfo, termsOfService, orderingPolicy, depositPercentage } = req.body;
    const data: any = {};
    if (adminCode !== undefined) {
      if (typeof adminCode !== 'string' || adminCode.length < 4) {
        res.status(400).json({ error: 'Admin code must be at least 4 characters' });
        return;
      }
      data.adminCode = adminCode;
    }
    if (finalDepositDate !== undefined) data.finalDepositDate = finalDepositDate;
    if (cookDay !== undefined) data.cookDay = cookDay;
    if (payIdInfo !== undefined) data.payIdInfo = payIdInfo;
    if (termsOfService !== undefined) data.termsOfService = termsOfService;
    if (orderingPolicy !== undefined) data.orderingPolicy = orderingPolicy;
    if (depositPercentage !== undefined) {
      if (depositPercentage === '') {
        res.status(400).json({ error: 'Deposit percentage is required' });
        return;
      }
      const parsedDepositPercentage = Number(depositPercentage);
      if (!Number.isInteger(parsedDepositPercentage) || parsedDepositPercentage < 0 || parsedDepositPercentage > 100) {
        res.status(400).json({ error: 'Deposit percentage must be a whole number from 0 to 100' });
        return;
      }
      data.depositPercentage = parsedDepositPercentage;
    }

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
app.post('/api/faqs', requireAdmin, async (req, res) => {
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
app.delete('/api/faqs/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const faqId = parseId(id);
    if (faqId === null) {
      res.status(400).json({ error: 'Invalid FAQ ID' });
      return;
    }
    await prisma.fAQ.delete({ where: { id: faqId } });
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete FAQ item' });
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

const startServer = async () => {
  await prisma.config.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      adminCode: '1234',
      payIdInfo: 'Your PayID Here'
    }
  });

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
