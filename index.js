const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

//middle ware
app.use(cors())
app.use(express.json())


//routers

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.slkyjzr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

      const database = client.db('CourseDB');
      const CourseCollection = database.collection('courses');
      const instructorCollection = database.collection('instructor');
      

      app.get('/course',async(req,res)=>{
        const cursor = CourseCollection.find()
        const result = await cursor.toArray();
        res.send(result);
      })

      app.post('/course',async(req,res)=>{
        const data = req.body;
        // console.log(data);
        const result = await CourseCollection.insertOne(data);
        res.send(result);
      })
      app.delete('/course/:id',async(req,res)=>{
        const id = req.params.id;
        const query = {_id:new ObjectId(id)}
        const result= await CourseCollection.deleteOne(query)
        res.send(result)
      })
      app.get('/course/:id',async(req,res)=>{
        const id = req.params.id;

        const query = {_id:new ObjectId(id)}
        const result =await CourseCollection.findOne(query);
        res.send(result);
      })

      app.put('/course/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const options = {upsert:true}
        const updatedCourse = req.body;
        const course = {
          $set:{
            title:updatedCourse.title,
            duration:updatedCourse.duration,
            instructorName:updatedCourse.instructorName,
            lessonNo:updatedCourse.lessonNo,
            numOfStudents:updatedCourse.numOfStudents,
            money:updatedCourse.money,
            rating:updatedCourse.rating,
            description:updatedCourse.description,
            files:updatedCourse.files,
          }
        }

        const result = await CourseCollection.updateOne(filter, course, options)
        res.send(result)
      })

      app.get('/instructor',async(req,res)=>{
        const cursor = instructorCollection.find();
        const result = await cursor.toArray();
        res.send(result);
      })

      app.post('/instructor',async(req,res)=>{
        const data = req.body;
        // console.log(data);
        const result = await instructorCollection.insertOne(data);
        res.send(result);
      })
      app.delete('/instructor/:id',async(req,res)=>{
        const id = req.params.id
        // console.log(data);
        const query = {_id:new ObjectId(id)}

        const result = await instructorCollection.deleteOne(query);
        res.send(result);
      })

      app.get('/instructor/:id',async(req,res)=>{
        const id  = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await instructorCollection.findOne(query)
        res.send(result)
      })
      app.put('/instructor/:id',async(req,res)=>{
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)}
        const options = {upsert:true}
        const updatedInstructor = req.body;
        const instructor = {
          $set:{
            name:updatedInstructor.name,
            experience:updatedInstructor.experience,
            instructor_type:updatedInstructor.instructor_type,
            education:updatedInstructor.education,
            description:updatedInstructor.description,
            file:updatedInstructor.file
           }
        }

        const result = await instructorCollection.updateOne(filter, instructor, options)
        res.send(result)
      })

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/',(req,res)=>{
    res.send("hello world");
})

app.listen(port,()=>{
    console.log(`great learning server running port on: ${port}`);
})
