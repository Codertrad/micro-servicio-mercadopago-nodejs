const express = require("express");
const axios = require("axios");
const app = express();
const {database} = require("./utils/firebase");
const { collection, addDoc,updateDoc,doc } = require("firebase/firestore");
const cors = require("cors");
const { mercadopago } = require("./mercadopago/index");
app.use(cors());
app.use(express.json());

app.post("/mercadopago", async (req, res) => {
  const {
    order: { items, infoShipping, buyer },
    order
  } = req.body;


  try {
    const queryRef = collection(database, "ordenes de compra");
    //agregamos el documento y obtenemos el id de ref de la orden
    addDoc(queryRef, order).then(async(respuesta) => {
      const preference = {
         metadata: {
            idShop:respuesta.id,
         },
         items: items.map((item) => {
           return {
             title: item.ref,
             description: item.brand,
             picture_url: item.image,
             category_id: item.gender,
             quantity: item.quantity,
             currency_id: "COP",
             unit_price: item.totalDiscountPrice,
           };
         }),
       };

       const mercadoResponse = await mercadopago.preferences.create(preference);
       res.status(200).json({ openWindow: mercadoResponse.body.init_point });
    }).catch(err =>{
      console.log(err)
    });
  } catch (error) {
    console.log(error);
    res.status(400);
  }
});


app.post("/webhooks", async (req, res) => {
  const {
    data: { id },
    type,
  } = req.body;
  try {
    if (id !== "123456789" && type === "payment") {
      const { data } = await axios.get(
        `https://api.mercadopago.com/v1/payments/${id}`,
        {
          headers: {
            Authorization: "Bearer " + process.env.ACCESS_TOKEN,
          },
        }
      );
      const {metadata:{id_shop}} = data;
      if (data.status === "approved" && data.status_detail === "accredited") {
        const docRef = doc(database, "ordenes de compra", id_shop);
        updateDoc(docRef, {ispaid:"approved"}).then(docRef => {
            console.log("A New Document Field has been added to an existing document");
        })
        .catch(error => {
            console.log(error);
        })
      }
    }
  } catch (error) {
    console.log(error);
  }

  return res.status(200).send("OK");
});

app.listen(5000, () => {
  console.log("server started on port 5000");
});
