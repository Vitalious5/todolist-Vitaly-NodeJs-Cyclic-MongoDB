//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

/////// connect to Mongoose DB

mongoose.set('strictQuery', false);
const connectDB = async ()=> {
  try{
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  }catch(error){
    console.log(error);
    process.exit(1);
  }
}


/////////////

// create new schemas

const itemsSchema = {
  name : String
};

// create new Monggose Model based on schema

const Item = mongoose.model("Item", itemsSchema);

// create new documents

const item1 = new Item({
  name: "Welcome to your to do list"
});

const item2 = new Item({
  name: "Item number 2"
});

const item3 = new Item({
  name: "item number 3"
});


//inserts items documents into array

const defaultItems = [item1, item2, item3];

// create an array of lists

const listSchema = {
  name: String,
  items: [itemsSchema]
};

// create list model

const List = mongoose.model("List", listSchema);

// create new list items

app.get("/", function(req, res) {
  Item.find({}).then(function(foundItems) {
    console.log(foundItems);
    if (foundItems.length === 0) { // if the array is empty insert new items (insert only is it's empty)
      Item.insertMany(defaultItems)
        .then((result) => {
          console.log("Items added successfully to items collection!");
          res.redirect("/");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/");
        });
    } else {    // if the array is not emty show what it includes
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  })
  .catch((err) => {
    console.log(err);
    res.status(500).send("Error occurred while finding items");
  });
});

// custom list get requests

app.get("/:customListName", function(req,res){
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName})
  .then((foundList)=>{
    if(foundList){
      console.log("List exists!");
      res.render("list", {listTitle: foundList.name, newListItems: foundList.items}); // render existing list page
    }else{
      console.log("List does not exists! Creating new list...");
       //create new list document since it does not exist
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      //save the newly created list document
      list.save();
      console.log("List created! Yay!");
      res.redirect("/" + customListName); // redirect to the newly created list
    }
  }).catch((err)=>{
    console.log("There was an error finding that list: " + err);
  });

});

// add new item when clicking on '+' icon

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({   //create new document for the the item and save it
    name: itemName
  });

  if(listName === "Today"){ //check if we're on the root page
    item.save(); //save the newely created item
    res.redirect("/"); // redirecting to see changes taking affect

  // if we're not on root page
  }else{
    List.findOne({name: listName})
    .then((foundList)=>{
      foundList.items.push(item);
      foundList.save(); //save the newely created item
      res.redirect("/" + listName); // redirecting to relevant page list to see changes taking affect
    }).catch((err)=>{
      console.log("An error occured: " + err);
    })
  }

});

// remove item from list when clicking the check element

app.post("/delete", function(req,res){
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  //if the item we're trying to remove is from the root page
  if(listName === "Today"){
    Item.findByIdAndRemove(checkedItemId).then((checkedItemId)=>{
      console.log("item removed succesfully!");
      res.redirect("/");
    }).catch((err)=>{
      console.log(err);
      res.redirect("/");
    });
  // if we're trying to remove from a custom list
  }else{
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}) //use mongoDB native method to remove from array
    .then((foundList)=>{
      res.redirect("/" + listName);
    }).catch((err)=>{
      console.log("Could not find list: " + err);
      res.redirect("/" + listName);
    });

  }

});

app.get("/about", function(req, res){
  res.render("about");
});

connectDB().then(()=>{
  app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
  })
});