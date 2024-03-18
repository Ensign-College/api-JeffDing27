const express = require('express');
const Redis = require('redis');
const bodyParser = require('body-parser');
const { addOrder, getOrder } = require("./services/orderservice.js");
const { addOrderItem, getOrderItem } = require("./services/orderItems");
const fs = require("fs");
const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json", "utf8"));
const Ajv = require("ajv");
const ajv = new Ajv();

const redisClient = Redis.createClient({
    url: process.env.REDIS_URL // Use environment variable for Redis URL
});

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Order API endpoints
app.post("/orders", async (req, res) => {
    try {
        const order = req.body;
        if (!validateOrder(order)) {
            return res.status(400).json({ error: "Invalid order" });
        }
        await addOrder({ redisClient, order });
        res.status(201).json({ message: "Order created successfully" });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/orders/:orderId", async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await getOrder({ redisClient, orderId });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        res.status(200).json(order);
    } catch (error) {
        console.error("Error retrieving order:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Order items API endpoints
app.post("/orderItems", async (req, res) => {
    try {
        const validate = ajv.compile(Schema);
        const valid = validate(req.body);
        if (!valid) {
            return res.status(400).json({ error: "Invalid request body" });
        }
        const orderItemId = await addOrderItem({ redisClient, orderItem: req.body });
        res.status(201).json({ orderItemId, message: "Order item added successfully" });
    } catch (error) {
        console.error("Error adding order item:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get("/orderItems/:orderItemId", async (req, res) => {
    try {
        const orderItemId = req.params.orderItemId;
        const orderItem = await getOrderItem({ redisClient, orderItemId });
        if (!orderItem) {
            return res.status(404).json({ error: "Order item not found" });
        }
        res.status(200).json(orderItem);
    } catch (error) {
        console.error("Error getting order item:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Inventory API endpoints
app.post('/inventory', async (req, res) => {
    try {
        const newInventory = req.body;
        const productKey = `product:${newInventory.productID}-${Date.now()}`;
        await redisClient.json.set(productKey, '.', newInventory);
        res.status(201).json(newInventory);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/inventory/:productID', async (req, res) => {
    try {
        const inventory = await redisClient.json.get(`product:${req.params.productID}`);
        if (!inventory) {
            return res.status(404).json({ error: 'Inventory not found' });
        }
        res.status(200).json(inventory);
    } catch (error) {
        console.error('Error retrieving inventory:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`API is listening on port ${PORT}`);
});

// Helper function to validate order
function validateOrder(order) {
    return order.productQuantity && order.ShippingAddress;
}
