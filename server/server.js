const express = require('express')
const app = express()
const port = 3000
const cors = require('cors')
const corsOptions = {
    origin: "http://localhost:5173",
}
app.use(cors(corsOptions))


app.get('/api', (req, res) => {
    res.json({workouts: ["Bench Press", "Triceps Press","Preacher Curls"]})
})


app.listen(port, () => {
    console.log(`Listening on port ${port}`)
})