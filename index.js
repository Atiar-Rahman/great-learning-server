const express = require('express');
const cors = require('cors');
require('dotenv').config();
const SSLCommerzPayment = require('sslcommerz-lts')

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


const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASS;
const is_live = false //true for live, false for sandbox


async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });

    const database = client.db('CourseDB');
    const CourseCollection = database.collection('courses');
    const instructorCollection = database.collection('instructor');
    const contactInfoCollection = database.collection('contactInfo');
    const orderCollection = database.collection('order')

    const tran_id = new ObjectId().toString();//random id generate

    app.post('/enroll', async (req, res) => {

      const course = await CourseCollection.findOne({ _id: new ObjectId(req.body.courseId) })
      // console.log(course)
      const courseData = req.body;
      const data = {
        total_amount: course?.money,
        currency: 'BDT',
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `http://localhost:3000/payment/success/${tran_id}`,
        fail_url: `http://localhost:3000/payment/fail/${tran_id}`,
        cancel_url: 'http://localhost:3030/cancel',
        ipn_url: 'http://localhost:3030/ipn',
        shipping_method: 'Courier',
        product_name: course.title,
        product_category: 'Electronic',
        product_profile: 'general',
        cus_name: courseData.name,
        cus_email: courseData.email,
        cus_add1: 'Dhaka',
        cus_add2: 'Dhaka',
        cus_city: 'Dhaka',
        cus_state: 'Dhaka',
        cus_postcode: '1000',
        cus_country: 'Bangladesh',
        cus_phone: '01711111111',
        cus_fax: '01711111111',
        ship_name: 'Customer Name',
        ship_add1: 'Dhaka',
        ship_add2: 'Dhaka',
        ship_city: 'Dhaka',
        ship_state: 'Dhaka',
        ship_postcode: 1000,
        ship_country: 'Bangladesh',
      };
      console.log(data)
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({url:GatewayPageURL})

        const finalOrder = {
          course,paidStatus: false,transjactionId: tran_id
        }
        const result = orderCollection.insertOne(finalOrder)


        console.log('Redirecting to: ', GatewayPageURL)
      });

        app.post('/payment/success/:tranId',async(req,res)=>{
          console.log(req.params.tranId)
          const result =await orderCollection.updateOne({transjactionId:req.params.tranId},{
            $set:{
              paidStatus:true
            }
          })
          if(result.modifiedCount>0){
            res.redirect(`http://localhost:5173/payment/success/${req.params.tranId}`)
          }
        })

        app.post('/payment/fail/:tranId',async(req,res)=>{
          const result = await orderCollection.deleteOne({transjactionId: req.params.tranId})

          if(result.deletedCount){
            res.redirect(`http://localhost:5173/payment/fail/${req.params.tranId}`)
          }
        })
    })

    app.get('/contactinfo', async (req, res) => {
      const cursor = contactInfoCollection.find();
      const result = await cursor.toArray();
      res.send(result)
    })

    app.post('/contactinfo', async (req, res) => {
      const data = req.body;
      const result = await contactInfoCollection.insertOne(data)
      res.send(result);
    })

    app.get('/course', async (req, res) => {
      const cursor = CourseCollection.find()
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/course', async (req, res) => {
      const data = req.body;
      // console.log(data);
      const result = await CourseCollection.insertOne(data);
      res.send(result);
    })
    app.delete('/course/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await CourseCollection.deleteOne(query)
      res.send(result)
    })
    app.get('/course/:id', async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) }
      const result = await CourseCollection.findOne(query);
      res.send(result);
    })

    app.put('/course/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedCourse = req.body;
      const course = {
        $set: {
          title: updatedCourse.title,
          duration: updatedCourse.duration,
          instructorName: updatedCourse.instructorName,
          lessonNo: updatedCourse.lessonNo,
          numOfStudents: updatedCourse.numOfStudents,
          money: updatedCourse.money,
          rating: updatedCourse.rating,
          description: updatedCourse.description,
          files: updatedCourse.files,
        }
      }

      const result = await CourseCollection.updateOne(filter, course, options)
      res.send(result)
    })

    app.get('/instructor', async (req, res) => {
      const cursor = instructorCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.post('/instructor', async (req, res) => {
      const data = req.body;
      // console.log(data);
      const result = await instructorCollection.insertOne(data);
      res.send(result);
    })
    app.delete('/instructor/:id', async (req, res) => {
      const id = req.params.id
      // console.log(data);
      const query = { _id: new ObjectId(id) }

      const result = await instructorCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await instructorCollection.findOne(query)
      res.send(result)
    })
    app.put('/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true }
      const updatedInstructor = req.body;
      const instructor = {
        $set: {
          name: updatedInstructor.name,
          experience: updatedInstructor.experience,
          instructor_type: updatedInstructor.instructor_type,
          education: updatedInstructor.education,
          description: updatedInstructor.description,
          file: updatedInstructor.file
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

app.get('/', (req, res) => {
  res.send("hello world");
})

app.listen(port, () => {
  console.log(`great learning server running port on: ${port}`);
})
