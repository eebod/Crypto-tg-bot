const { MongoClient } = require('mongodb');
require('dotenv').config();

class DB {
    constructor() {
        this.db = null; // Initialize DB Object
        this.userCollection = null; // Collection Identifier
    }

    async connect() {
        try {
            const uri = process.env.DB_CONNECTION_URI; // Connection URL
            if (!uri) {
                throw new Error('DB_CONNECTION_URI is not defined in environment variables');
            }

            const client = new MongoClient(uri);
            await client.connect(); // Connect to the MongoDB server

            this.db = client.db(process.env.DB_NAME || 'cryptoTrends'); // Use env variable for DB name or default
            this.userCollection = this.db.collection('users');
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Error connecting to the database:', error.message);
            throw new Error('Failed to connect to the database');
        }
    }

    async insertAlert(dataObj) {
        try {
            const { chatId, coinId, targetPrice, alertCode, targetReached } = dataObj;
            if (!chatId || !coinId || !targetPrice || !alertCode || targetReached === undefined) {
                throw new Error('Invalid data object for insertAlert');
            }

            await this.userCollection.updateOne(
                { _id: chatId },
                { $push: { alerts: { coinId, targetPrice, alertCode, targetReached } } },
                { upsert: true }
            );
        } catch (error) {
            console.error('Error inserting alert:', error.message);
            throw error;
        }
    }

    async retrieveAlerts(chatId) {
        try {
            if (!chatId) {
                throw new Error('chatId is required to retrieve alerts');
            }

            const data = await this.userCollection.findOne({ _id: chatId });
            return data ? data.alerts : null;
        } catch (error) {
            console.error('Error retrieving alerts:', error.message);
            throw error;
        }
    }

    async updateAlertList(addItem, dataObj) {
        try {
            if (!dataObj || !dataObj.chatId) {
                throw new Error('Invalid data object for updateAlertList');
            }

            let data;
            if (addItem) {
                const { chatId, coinId, targetPrice, alertCode, targetReached } = dataObj;
                if (!coinId || !targetPrice || !alertCode || targetReached === undefined) {
                    throw new Error('Invalid data object for adding alert');
                }

                data = await this.userCollection.updateOne(
                    { _id: chatId },
                    { $push: { alerts: { coinId, targetPrice, alertCode, targetReached } } }
                );
            } else {
                const { chatId, alertCode } = dataObj;
                if (!alertCode) {
                    throw new Error('alertCode is required to remove an alert');
                }

                data = await this.userCollection.updateOne(
                    { _id: chatId },
                    { $pull: { alerts: { alertCode } } }
                );
            }
            return data;
        } catch (error) {
            console.error('Error updating alert list:', error.message);
            throw error;
        }
    }

    async retrieveAlertsLength(chatId) {
        try {
            if (!chatId) {
                throw new Error('chatId is required to retrieve alerts length');
            }

            const data = await this.userCollection.findOne({ _id: chatId });
            if (!data) {
                return { qty: 0, usrAvb: false };
            }
            return { qty: data.alerts.length, usrAvb: true };
        } catch (error) {
            console.error('Error retrieving alerts length:', error.message);
            throw error;
        }
    }

    async retrieveActiveAlerts() {
        try {
            const data = await this.userCollection.find({ alerts: { $elemMatch: { targetReached: false } } }).toArray();
            if (!data) return null;

            const filteredData = data.map((val) => {
                return val.alerts
                    .filter((target) => !target.targetReached)
                    .map((target) => target.coinId);
            }).flat();

            // Make array unique
            const uniqueData = [...new Set(filteredData)];
            return uniqueData;
        } catch (error) {
            console.error('Error retrieving active alerts:', error.message);
            throw error;
        }
    }

    async findAndUpdateAlerts(cid, currentPrice) {
        try {
            if (!cid || !currentPrice) {
                throw new Error('coinId and currentPrice are required to find and update alerts');
            }

            const epochSecondTimeStamp = Math.floor(Date.now() / 1000);

            // Upper and lower bounds
            const lowerBound = parseFloat((currentPrice - (currentPrice * 0.01)).toFixed(6));
            const upperBound = parseFloat((currentPrice + (currentPrice * 0.01)).toFixed(6));

            // Fetch and update many
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
                const updatedDocs = await this.userCollection.find({ alerts: { $elemMatch: { triggerDate: epochSecondTimeStamp } } }).project({ _id: 1, "alerts.$": 1 }).toArray();
                updatedIds = updatedDocs.map((doc) => {
                    return { id: doc._id, targetPrice: doc.alerts[0].targetPrice };
                });
            }

            return updatedIds;
        } catch (error) {
            console.error('Error finding and updating alerts:', error.message);
            throw error;
        }
    }
}

module.exports = DB;