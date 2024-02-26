const express = require('express'); // express makes APIs- connect fronted to server
const Redis = require('redis'); //import the Redis Library
const bodyParser= require('body-parser');
const cors = require('cors');
const { addOrder, getOrder} = require("./services/orderservice.js");
const { addOrderItem, getOrderItem} = require("./services/orderItems");
const fs = require("fs");
const Schema = JSON.parse(fs.readFileSync("./orderItemSchema.json", "utf8"));
const Ajv = require("ajv");
const ajv = new Ajv();

const options = {
    origin:'http://localhost:3000'//allow our frontend to call this backend
}
//import express from 'express';
const redisClient = Redis.createClient({
    url:`redis://localhost:6379`
});

const app = express ();//creat express app

const port = 3001; //this is the port number

app.use(bodyParser.json());
app.use(cors(options));//allow frontend to call backend

app.listen(port, ()=>{
    redisClient.connect();//this connects to the redis database!!!!!!
    console.log(`API is Listening on port: ${port}`);//emplate literal
}); //listen for web requests from the frontend and docker

//order
app.post("/orders", async (req, res)=>{
    let order = req.body;
    //order dtails, cinlude product quantity and shipping address
    let responseStatus = order.productQuantity
    ? 200
    : 400 && order.ShippingAddress
    ? 200
    : 400;

if (responseStatus ===200){
    try{
        // addOrder function to handle order creation in the database
        await addOrder({ redisClient, order});
    }catch (error){
        console.error(error);
        res.status(500).send("Internal Server Error");
        return;
    }
    }else{
        res.status (responseStatus);
        res.send(
            `Missing one of the following fields: ${exactMatchOrderFields()} ${partiallyMatchOrderFields()}`
        );
    }
    res.status(responseStatus).send();
});

app.get("/orders/:orderId", async (req, res)=>{
//get the order from the database
const orderId = req.params.orderId;
let order = await getOrder({redisClient, orderId});
if (order === null){
    res.status(404).send("Order not found");
}else{
    res.json(order);
}
});
//ORDER ITEMS
app.post("/orderItems", async (req, res)=>{
try{
    console.log("Schema:", Schema);
    const validate = ajv.compile(Schema);
    const valid = validate(req.body);
    if (!valid){
        return res.status(400).json({error: "Invalid request body"});
    }
    console.log("Request Body:", req.body);

    //Calling addOrderItem function and storing the result
    const orderItemId = await addOrderItem({
        redisClient,
        orderItem: req.body,
    });

    //Responding with the result 
    res
     .status(201)
     .json({orderItemId, message: "Order item added successfully"});
}catch (error) {
    console.error("Error adding order item:", error);
    res.status(500).json({error: "Internal server error"});
}
});

app.get("/orderItems/:orderItemId", async (req, res)=>{
    try{
        const oderItemId = req.paramsorderItemId;
        const orderItem = await getOrderItem({ redisClient, orderItemId});
        res.json(orderItem);
    }catch (error){
        console.error("Error getting order item:", error);
        res.status(500).json({error: "Internal server error"});
    }
});


app.post('/inventory', async (req,res)=>{ //async means we will await promises

    const newInventory = req.body;
      

    const productKey= `product:${newInventory.productID}-${Date.now()}`;
    try{
    await redisClient.json.set(productKey,'.',newInventory);//saves the JSON in redis
    }catch (error){
        console.error(error);
    }
    res.json(newInventory);//respond with the new box

    // app.post('/boxes', async (req, res)=>{// async means we will await promises
    //     const newBox = req.body;
    //     newBox.id = parseInt(await redisClient.json.arrLen('boxes','$'))+1;//the user shouldn't be allowed to choose the ID
    //     await redisClient.json.arrAppend('boxes', '$',newBox); //saves the JSON in redis
    //     res.json(newBox);//respond with a new box
    // });

});

//1st parameter url
//2nd a function to return boxes
//req= the request from the browser
//res= the response from the server
app.get('/inventory/:productID', async (req, res)=>{

    try{
    let inventory = await redisClient.json.get(`product:${req.params.productID}`);
    
    if (inventory===null){
        return res.status(404).json({error: 'Inventory not found'});
    }
    res.json(inventory);

}catch (error){
    console.error('Error retrieving inventory:', error);
    res.status(500).json({error: 'Internal Server Error'});
}

    // app.get('/boxes', async (req, res)=>{
    //     let boxes = await redisClient.json.get('boxes', {path:'$'});//get the boxes
    //     //send the boxes to the browser
    //     res.json(boxes[0]);//send boxes as a string

}) 




console.log("Hello");