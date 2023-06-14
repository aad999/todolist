//jshint esversion:6

// require dotenv for setting up environment variables
require('dotenv').config();
// require express for route management
const express = require("express");
// require body-parser to tap into req of post requests
const bodyParser = require("body-parser");
// require mongoose for interacting with mongodb in nodejs applications
// it provides a layer of abstraction on the top of mongodb,
// such as by providing schema validation and object-document mapping
const mongoose = require("mongoose");
// lodash is required for string management
const _ = require("lodash");

const app = express();

// use port of the enviornment of the local port 3000
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// writing inside a async main function is recommended
async function main() {

  // connect to enviornment todolistDB of remote mongo server at mongo_uri
  await mongoose.connect(process.env.MONGO_URI + 'todolistDB')
    .then(() => app.listen(PORT, () => console.log("Server started.")))
    .catch((err) => console.log("Error connecting"));
  
  // define <name>sSchema (database)
  const itemsSchema = new mongoose.Schema({
    name: String
  });

  // define <Name> model (collection)
  const Item = new mongoose.model("Item", itemsSchema);

  // define <name><number> object (document)
  const item1 = new Item({
    name: "Welcome to your todolist!"
  });
  const item2 = new Item({
    name: "Hit the + button to aff a new item."
  });
  const item3 = new Item({
    name: "<-- Hit this to delete an item."
  });
  const defaultItems = [item1, item2, item3];

  const listSchema = {
    name: String,
    items: [itemsSchema]
  };
  const List = new mongoose.model("List", listSchema);

  app.get("/:customListName", async (req, res) => {
    const customListName = _.capitalize(req.params.customListName);
    const foundList = await List.findOne({ name: customListName });
    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      list.save();
      res.redirect("/" + customListName);
    }
    else{
      res.render("list", { listTitle: customListName, newListItems: foundList.items });
    }
  });

  app.get("/", async function (req, res) {

    const foundItems = await Item.find()
      .catch((err) => console.log("error finding items : \n" + err));

    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems)
        .then(() => { console.log("default items insertend successfully💛"); res.redirect("/"); })
        .catch((err) => console.log("error inserting default items :\n" + err));
    }
    else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }

  });

  app.post("/", async function (req, res) {

    const itemName = req.body.newItem;
    const listName = req.body.list;
    const item = new Item({
      name: itemName
    });
    if(listName === "Today"){
      await item.save();
      res.redirect("/");
    }
    else{
      const foundList = await List.findOne({name: listName});
      foundList.items.push(item);
      await foundList.save();
      res.redirect("/" + listName);
    }

  });

  app.post("/delete", async function (req, res) {

    const checkedItemId = req.body.checkbox;
    const listName = req.body.listName;
    if(listName === "Today"){
      await Item.findByIdAndRemove(checkedItemId)
        .then(() => console.log("deletion successful 🫡 "))
        .catch((err) => { console.log(err) });
      res.redirect("/");
    }
    else{
      await List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}})
      .then( () => res.redirect("/" + listName))
      .catch((err) => console.log(err));
    }

  });

}

main().catch(err => console.log("unsuccessful : \n" + err));
