const { MongoClient } = require('mongodb');
require('dotenv').config();

class DB{
    constructor(){
        this.db; // DB Object
        this.UserCollection // Collection Identifier
    }

    connect(){
        return new Promise(async (resolve, reject) => {
            try {
                const uri = process.env.DB_CONNECTION_URI; // Connection URL
                const client = new MongoClient(uri);

                await client.connect(); // Connect to the mongo DB server

                this.db = client.db('cryptoTrends');
                this.userCollection = this.db.collection('users');
                resolve(true);
            } catch (error) {
                console.error(error);
                reject(false)
            }
        });
    }

    async insertAlert(dataObj){
        try {
            const { chatId, coinId, targetPrice, alertCode, targetReached } = dataObj;
            await this.userCollection.insertOne({_id:chatId, alerts:[{ coinId, targetPrice, alertCode, targetReached }]})
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async retrieveAlerts(chatId){
        try {
            const data = await this.userCollection.findOne({_id: chatId});
            if (data) return data.alerts;
            return null;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async updateAlertList(addItem, dataObj){
        try {
            let data;
            if (addItem){
                const { chatId, coinId, targetPrice, alertCode, targetReached } = dataObj;
                data = await this.userCollection.updateOne({_id: chatId}, {$push: {alerts: { coinId, targetPrice, alertCode, targetReached } }});
            } else {
                const { chatId, alertCode } = dataObj;
                data = await this.userCollection.updateOne({_id: chatId}, {$pull: {alerts: { alertCode } }});
            }
            return data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async retrievAlertsLength(chatId){
        try {
            const data = await this.userCollection.findOne({_id: chatId});
            if(!data){
                return {qty: 0, usrAvb: false};
            }
            return {qty: data.alerts.length, usrAvb: true};
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async retrieveActivealerts(){
        try {
            const data = await this.userCollection.find({ alerts: { $elemMatch: { targetReached: false } } }).toArray();
            if(!data) return null;

            const filteredData = data.map((val) => { 
                return val.alerts
                    .filter((target) => !target.targetReached)
                    .map((target) => target.coinId)
            }).flat();

            // Make array unique
            const uniqueData = [...new Set(filteredData)];
            return uniqueData;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    async findAndUpdateAlerts(cid, currentPrice){
        try {
            const epochSecondTimeStamp = Math.floor(Date.now() / 1000);

            // Upper and lower Bounds
            const lowerBound = parseFloat((currentPrice - (currentPrice * 0.01)).toFixed(6));
            const upperBound = parseFloat((currentPrice + (currentPrice * 0.01)).toFixed(6));

            // Fetch and Update Many
            const updateData = await this.userCollection.updateMany(
                {
                  alerts: {
                    $elemMatch: {
                      coinId: cid,
                      targetReached: false,
                      targetPrice: {
                        $gte: lowerBound,
                        $lte: upperBound
                      }
                    }
                  }
                },
                {
                  $set: {
                    "alerts.$[elem].triggerDate": epochSecondTimeStamp,
                    "alerts.$[elem].targetReached": true
                  }
                },
                {
                  arrayFilters: [{
                    "elem.coinId": cid,
                    "elem.targetReached": false,
                    "elem.targetPrice": {
                      $gte: lowerBound,
                      $lte: upperBound
                    }
                  }],
                  multi: true
                }
            );

            let updatedIds = [];
            if (updateData.modifiedCount > 0) {
                const updatedDocs = await this.userCollection.find({ alerts: { $elemMatch: { triggerDate: epochSecondTimeStamp }}}).project({ _id: 1, "alerts.$": 1 }).toArray();
                updatedIds = updatedDocs.map((doc) => { return { id: doc._id, targetPrice: doc.alerts[0].targetPrice } });
            }
            
            return updatedIds;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
}

module.exports = DB;