const urlModel= require("../models/urlModel")
const {isValid,isValidBody,isValidUrl}= require("../validation/validation")
const shortId= require("shortid")
const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
  13190,
  "redis-13190.c301.ap-south-1-1.ec2.cloud.redislabs.com",
  { no_ready_check: true }
);
redisClient.auth("gkiOIPkytPI3ADi14jHMSWkZEo2J5TDG", function (err) {
  if (err) throw err;
});

redisClient.on("connect", async function () {
  console.log("Connected to Redis..");
});



const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);



const createUrl= async function(req,res){
try{
    const body=req.body
    const {longUrl} = body

    if(!isValidBody(body)) return res.status(400).send({status:false,message:"Body Should not be empty"}) 
    if(!("longUrl" in body)) return res.status(400).send({status:false,message:"LongUrl Is required"})
    if(!isValid(longUrl)) return res.status(400).send({status:false,message:"LongUrl Should not be empty"})
    if(!isValidUrl(longUrl)) return res.status(400).send({status:false,message:`"${longUrl}" is not a Valid url`}) 
    if(await urlModel.findOne({longUrl:longUrl})) return res.status(400).send({status:false,message:`${longUrl} is already exists`})
    
    shortId.characters('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_=');
    let smallId= shortId.generate(longUrl)
    console.log(smallId)
    body.urlCode=smallId
    body.shortUrl="https://localhost:3000/" + smallId
    let data =await urlModel.create(body)
    let selecteddata= {longUrl:data.longUrl,shortUrl:data.shortUrl,urlCode:data.urlCode}
    res.status(201).send({status:true,message:"Done",data:selecteddata})
}
catch (err){
    res.status(500).send({status:false,message:err.message})
    console.log(err.message)
}
}

const getUrl= async function(req,res){
try{
    let code= req.params.urlCode
    if(!shortId.isValid(code)) return res.status(400).send({status:false,message:"Pls Enter Urlcode In valid Format"})
    if(!(await urlModel.findOne({urlCode:code}))) return res.status(404).send({status:false,message:"This Code doesnot exists"})
    let url= await GET_ASYNC(`${req.params.urlCode}`)
    
    if(url) {
        console.log(url);
        console.log("catch");
        res.redirect(url)
      } else {
        let profile = await urlModel.findOne({urlCode:code})//.select({longUrl:1,_id:0})
        await SET_ASYNC(`${req.params.urlCode}`, profile.longUrl)
        console.log(JSON.stringify(profile.longUrl));
        console.log("catch1");
        res.redirect(profile.longUrl);
      }
   // res.redirect(url.longUrl)
    }
    catch(err){
        res.status(500).send({status:false,message:err.message})
    }
}
/*
const fetchAuthorProfile = async function (req, res) {
    let cahcedProfileData = await GET_ASYNC(`${req.params.authorId}`)
    if(cahcedProfileData) {
      res.send(cahcedProfileData)
    } else {
      let profile = await authorModel.findById(req.params.authorId);
      await SET_ASYNC(`${req.params.authorId}`, JSON.stringify(profile))
      res.send({ data: profile });
    }
  
  };
  

const notFound= function(req,res){
    res.status(404).send({status:false,message:"Route not found"})
}
*/
module.exports={createUrl,getUrl}