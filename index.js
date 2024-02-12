const express = require('express'); // express makes APIs- connect fronted to server
const Redis = require('redis'); //import the Redis Library
const bodyParser= require('body-parser');
const cors = require('cors');

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

app.post('/inventory', async (req,res)=>{ //async means we will await promises
    
    const newInventory ={
        "itemID": "808",
        "productID": "PC003",
        "status": "In Stock"
    }

    const productKey= `product:${newInventory.productID}-${Date.now()}`;
    try{
    await redisClient.json.set(productKey,'.',newInventory);//saves the JSON in redis
    }catch (error){
        console.error(error);
    }
    res.json(newInventory);//respond with the new box

});

//1st parameter url
//2nd a function to return boxes
//req= the request from the browser
//res= the response from the server
app.get('/boxes', async (req, res)=>{
    let boxes = await redisClient.json.get('boxes', {path:'$'});//get the boxes
    //send the boxes to the browser
    res.json(boxes[0]);//send boxes as a string

}) 




console.log("Hello");