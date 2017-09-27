const router = require("express").Router();
const Article = require("../../models/Articles.js");
const Game = require("../../models/Games.js");
const User = require("../../models/Users.js")
const request = require("request");
const cheerio = require("cheerio");
const Nightmare = require("nightmare");
const mongoose = require("mongoose");


// Newsfeed scraper - searches top links in r/boardgames for the users.
router.get("/news/scrape", function(req, res){
	request("https://www.reddit.com/r/boardgames/top/?sort=top&t=day", function(error, response, html) {
		let blacklist = ["self.boardgames", "youtube.com", "youtu.be"];
		let $ = cheerio.load(html);
		$("p.title").each(function(i, element) {
			if (!blacklist.includes($(element).children("span").children("a").text())){
				let article = new Article({
					title: $(element).children("a").text(),
					link: $(element).children("a").attr("data-href-url"),
				})
				article.save();
			}

		})
		setTimeout(function(){
			Article.find().sort({date: -1}).exec(function(error, result){
			res.json(result.slice(0,5))
		}), 1000
		})
	})
})

// For scraping from BGG to get boardgame info
router.get("/games/:name", function(req, res){
	let nightmare = Nightmare ({ show: false });
	nightmare
		.goto ("https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&B1=Go&q=" + req.params.name)
		.click('div#results_objectname1 > a:nth-child(1)')
		.wait(".game-header-body")
		.evaluate(function(){
			return {
				name: document.getElementsByClassName("game-header-title-info")[1].children[0].children[0].innerText.trim(),
				minPlayers: document.getElementsByClassName("gameplay-item-primary")[0].children[0].children[0].innerText,
				maxPlayers: document.getElementsByClassName("gameplay-item-primary")[0].children[0].children[1].innerText[1],
				playtime: document.getElementsByClassName("gameplay-item-primary")[1].children[0].children[0].innerText
			}
		})
		.end()
		.then(function(returnObj){
			res.json(returnObj)

		})

	// request("https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&B1=Go&q=" + req.params.name, function(error, response, html) {
	// 	let $ = cheerio.load(html);
	// 	$("#results_objectname1").each(function(i, element) {
	// 		let link = "https://boardgamegeek.com" + $(element).children("a").attr("href");
	// 		request(link, function(error1, response1, html1) {
	// 			let $1 = cheerio.load(html1);
	// 			$1(".game-header-body").each(function(i1, element1){
	// 				// let result = {
	// 				// 	name: element1.children(".game-header-title-container").children(".game-header-title").children(".game-header-title-info").children("h1").text()
	// 				// }
	// 				res.json("element1")
	// 			})
	// 		})
	// 	})

	// })
})

// This is the route that the Gamelist Module calls when it mounts - searches the database, finds the user (passed in through params), and returns a populated list of games.
router.get("/games/:uid/mylist", (req, res) => {
	console.log("Getting user gamelist.");
	User.findOne({ _id : req.params.uid}).exec((error, result) => {
		res.json(result);
	})
})

// For posting a new game linked to a users account. Called from the submit button on the add game modal in Dashboard component.
router.post("/newgame/:name/:uid", (req, res) => {
	let gameName = req.params.name;
	let userID = req.params.uid;
	console.log("Postin a god damned game, " + gameName);
	//Add the game to the Users mygameslist.
	User.findOneAndUpdate({ _id : userID }, {$push:  {mygameslist : gameName}}).exec((error, result) => {
		console.log(error);
		res.json(result);
	})
	//Add the user to the games user thing. Depending on which we want to use.
	// Game.findOneAndUpdate({ title : gameName }, { users : userID}).exec((error, result) => {
	// 	console.log(error);
	// 	res.json(result);
	// })
})

// Route for checking user status and getting mongoUID.
router.post("/user/:uid", (req, res) => {
	console.log("Trying to create new account.");
	let user = new User({ _id : req.params.uid })
	user.save((err) => {
		if (err) return console.log(err)
		else res.json(res);
	})
})

module.exports = router;
