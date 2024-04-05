const Redis = require('redis');
const { addOrder, getOrder } = require("./services/orderservice.js");
const { addOrderItem, getOrderItem } = require("./services/orderItems");
const fs = require("fs");
const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json", "utf8"));
const Ajv = require("ajv");
const ajv = new Ajv();

const redisClient = Redis.createClient({
    url: `redis://localhost:6379`
});

exports.test = async (event, context) => {
    event.redisClient = redisClient;
    return{
        statusCode: 200,
        body: JSON.stringify({message: 'WORKS!', event, context})
    }
    };

exports.createOrder = async (event, context) => {
    try {
        const order = JSON.parse(event.body);
        const responseStatus = order.productQuantity && order.ShippingAddress ? 200 : 400;

        if (responseStatus === 200) {
            await addOrder({ redisClient, order });
        } else {
            return {
                statusCode: responseStatus,
                body: `Missing one of the following fields: ${exactMatchOrderFields(order)} ${partiallyMatchOrderFields(order)}`
            };
        }

        return { statusCode: responseStatus };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};

exports.getOrderById = async (event, context) => {
    try {
        const orderId = event.pathParameters.orderId;
        const order = await getOrder({ redisClient, orderId });
        
        if (!order) {
            return { statusCode: 404, body: "Order not found" };
        }
        
        return { statusCode: 200, body: JSON.stringify(order) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "It is rainning !" };
    }
};

exports.addOrderItem = async (event, context) => {
    try {
        const validate = ajv.compile(Schema);
        const valid = validate(JSON.parse(event.body));

        if (!valid) {
            return { statusCode: 400, body: JSON.stringify({ error: "Invalid request body" }) };
        }

        const orderItemId = await addOrderItem({ redisClient, orderItem: JSON.parse(event.body) });
        return { statusCode: 201, body: JSON.stringify({ orderItemId, message: "Order item added successfully" }) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};

exports.getOrderItemById = async (event, context) => {
    try {
        const orderItemId = event.pathParameters.orderItemId;
        const orderItem = await getOrderItem({ redisClient, orderItemId });
        
        if (!orderItem) {
            return { statusCode: 404, body: "Order item not found" };
        }
        
        return { statusCode: 200, body: JSON.stringify(orderItem) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "Internal Server Error" };
    }
};

exports.addInventory = async (event, context) => {
    try {
        const newInventory = JSON.parse(event.body);
        const productKey = `product:${newInventory.productID}-${Date.now()}`;
        await redisClient.json.set(productKey, '.', newInventory);
        return { statusCode: 201, body: JSON.stringify(newInventory) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "Hello Jose!" };
    }
};

exports.getInventoryByProductId = async (event, context) => {
    try {
        const inventory = await redisClient.json.get(`product:${event.pathParameters.productID}`);
        
        if (!inventory) {
            return { statusCode: 404, body: JSON.stringify({ error: 'Inventory not found' }) };
        }
        
        return { statusCode: 200, body: JSON.stringify(inventory) };
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: "Hello World!!" };
    }
};

const exactMatchOrderFields = (order) => {
    if (!order) return "";
    return Object.entries(order)
        .filter(([key, value]) => value !== undefined && value !== "")
        .map(([key]) => key)
        .join(", ");
};

const partiallyMatchOrderFields = (order) => {
    if (!order) return "";
    return Object.entries(order)
        .filter(([key, value]) => value === undefined || value === "")
        .map(([key]) => key)
        .join(", ");
};
