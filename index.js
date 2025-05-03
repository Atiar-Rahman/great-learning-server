const express = require('express');
const cors = require('cors');
require('dotenv').config();
const SSLCommerzPayment = require('sslcommerz-lts')
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const app = express();
const port = process.env.PORT || 3000;

//middle ware
// app.use(cors())

app.use(cors({
  origin: 'https://great-learning-f1298.web.app',
  credentials: true
}));
app.use(express.json())
app.use(cookieParser())
// app.use(cors({
//   origin: ['https://great-learning-f1298.web.app'],
//   credentials: true
// }));
// app.options('*', cors(corsOptions));
const logger = (req, res, next) => {
  // console.log("inside the logger")
  next();
}

// Middleware to verify the JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Get token from Authorization header

  if (!token) {
    return res.status(401).send({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Invalid or expired token' });
    }

    req.decoded = decoded; // Save the decoded payload for later use
    next(); // Proceed to the next middleware or route handler
  });
};

// Middleware to check if the user is an admin
// const varifyAdmin = async (req, res, next) => {
//   const email = req.decoded.email; // Get the email from the decoded token
//   console.log(email)
//   const user = await userCollection.findOne({ email });

//   if (!user) {
//     return res.status(404).send({ message: 'User not found' });
//   }

//   if (user.role !== 'admin') {
//     return res.status(403).send({ message: 'Forbidden: You are not an admin' });
//   }

//   next(); // User is an admin, proceed to the route handler
// };

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
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const database = client.db('CourseDB');
    const CourseCollection = database.collection('courses');
    const instructorCollection = database.collection('instructor');
    const contactInfoCollection = database.collection('contactInfo');
    const orderCollection = database.collection('order')
    const userCollection = database.collection("users")
    const videoCollection = database.collection('videos')
    const sylebusCollection = database.collection('sylebusCollection');
    const pythoncollection = database.collection('pythoncollection');


    // ✅ Auth route
    app.post('/jwt', (req, res) => {
      const user = req.body;

      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '5d' });

      res.cookie('token', token, {
        httpOnly: true,
        secure: true,         // ✅ required for cross-site cookies
        sameSite: 'None',     // ✅ required for cross-origin cookies
      })
        .send({ "admin": true })
    });

    // Get all Python basic course documents
    app.get('/pythonbasic', async (req, res) => {
      try {
        const result = await pythoncollection.find().toArray();
        res.send(result)
      } catch (error) {
        console.error('Error fetching pythonbasic data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Get all syllabus documents
    app.get('/syllabus', async (req, res) => {
      try {
        const result = await sylebusCollection.find().toArray();
        res.send(result)
      } catch (error) {
        console.error('Error fetching syllabus data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.post('/logout', (req, res) => {
      // Clear the HttpOnly cookie by setting it to a past date
      res.clearCookie('token');
      res.send({ success: true });
    });

    app.post('/video', verifyToken, async (req, res) => {
      const data = req.body;
      // console.log(data)
      const result = await videoCollection.insertOne(data)
      res.send(result)
    })

    app.get('/videos', verifyToken, async (req, res) => {
      const email = req.query.email;
      // console.log('Fetching videos for email:', email);
      // console.log('cuk cuk cooikes ',req.cookies) //read from cooikes
      if (req.user.email !== email) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      try {
        // 1. Find all orders for this email
        const orderQuery = { email: email };
        const ordersCursor = orderCollection.find(orderQuery);
        const orders = await ordersCursor.toArray();

        // 2. Extract course titles
        const courseNames = orders.map(order => order.course.title);
        // console.log('Course Names:', courseNames);

        if (courseNames.length === 0) {
          return res.send([]); // No orders
        }

        // 3. Match courseSelect field in videos
        const videoQuery = { courseSelect: { $in: courseNames } };
        const videosCursor = videoCollection.find(videoQuery);
        const videos = await videosCursor.toArray();

        // console.log('Found videos:', videos.length);

        res.send(videos);

      } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).send({ message: 'Server error' });
      }
    });


    const tran_id = new ObjectId().toString();//random id generate

    app.post('/enroll', async (req, res) => {

      const course = await CourseCollection.findOne({ _id: new ObjectId(req.body.courseId) })
      // console.log(course)
      const courseData = req.body;
      const data = {
        total_amount: course?.money,
        currency: 'BDT',
        tran_id: tran_id, // use unique tran_id for each api call
        success_url: `https://great-learning-f1298.web.app/payment/success/${tran_id}`,
        fail_url: `https://great-learning-f1298.web.app/payment/fail/${tran_id}`,
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
      // console.log(data)
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live)
      sslcz.init(data).then(apiResponse => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL
        res.send({ url: GatewayPageURL })

        const finalOrder = {
          course, paidStatus: false, transjactionId: tran_id, email: courseData.email
        }
        const result = orderCollection.insertOne(finalOrder)


        // console.log('Redirecting to: ', GatewayPageURL)
      });

      app.post('/payment/success/:tranId', async (req, res) => {
        // console.log(req.params.tranId)
        const result = await orderCollection.updateOne({ transjactionId: req.params.tranId }, {
          $set: {
            paidStatus: true
          }
        })
        if (result.modifiedCount > 0) {
          res.redirect(`https://great-learning-f1298.web.app/payment/success/${req.params.tranId}`)
        }
      })

      app.post('/payment/fail/:tranId', async (req, res) => {
        const result = await orderCollection.deleteOne({ transjactionId: req.params.tranId })

        if (result.deletedCount) {
          res.redirect(`https://great-learning-f1298.web.app/payment/fail/${req.params.tranId}`)
        }
      })
    })

    //users related api
    app.get('/users', verifyToken, async (req, res) => {
      const cursor = userCollection.find()
      const result = await cursor.toArray()
      res.send(result)
    })

    // Example of the backend code (Express.js)
    app.get('/users/admin/:email', async (req, res) => {
      try {
        const { email } = req.params;
        console.log(email)
        const user = await userCollection.findOne({ email });
    
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        res.json({ isAdmin: user?.isAdmin === true }); // Ensure consistent key
      } catch (err) {
        res.status(500).json({ message: 'Server error' });
      }
    });
    


    app.patch('/users/admin/:id', verifyToken, async (req, res) => {
      const { id } = req.params;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { role: 'admin' }
      };

      try {
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: 'Failed to update user role' });
      }
    });

    app.delete('/users/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result);
    })
    app.post('/users', async (req, res) => {
      const data = req.body;
      const result = await userCollection.insertOne(data)
      res.send(result)
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

    app.put('/course/:id', varifyAdmin, verifyToken, async (req, res) => {
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

    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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
