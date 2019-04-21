'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

const ipfsAPI = require('ipfs-api');
const fs = require('fs');
const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})

var file1= "abish";

//
// var fabric_client = new Fabric_Client();

// // setup the fabric network
// var channel = fabric_client.newChannel('tfbcchannel');
// var order = fabric_client.newOrderer('grpc://localhost:7050')
// channel.addOrderer(order);
// //add buyer peer
// var peer = fabric_client.newPeer('grpc://localhost:8051');
// channel.addPeer(peer);

//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Store path:'+store_path);
var tx_id = null;

// Add Organization 
function addOrg(req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);
	
	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
	
		
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// get a transaction id object based on the current user assigned to fabric client
		tx_id = fabric_client.newTransactionID();
		console.log("Assigning transaction_id: ", tx_id._transaction_id);
	
		// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
		// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
		// must send the proposal to endorsing peers
		var request = {chaincodeId: 'tfbccc',
			fcn: 'addOrg',
			args: [req.body.bankId, req.body.token],
			chainId: 'tfbcchannel',
			txId: tx_id};
	
		// send the transaction proposal to the peers
		return channel.sendTransactionProposal(request);
	}).then((results) => {
		var proposalResponses = results[0];
		var proposal = results[1];
		let isProposalGood = false;
		if (proposalResponses && proposalResponses[0].response &&
			proposalResponses[0].response.status === 200) {
				isProposalGood = true;
				console.log('Transaction proposal was good');
			} else {
				console.error('Transaction proposal was bad');
			}
		if (isProposalGood) {
			console.log(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
				proposalResponses[0].response.status, proposalResponses[0].response.message));
	
			// build up the request for the orderer to have the transaction committed
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
	
			// set the transaction listener and set a timeout of 30 sec
			// if the transaction did not get committed within the timeout period,
			// report a TIMEOUT status
			var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
			var promises = [];
	
			var sendPromise = channel.sendTransaction(request);
			promises.push(sendPromise); //we want the send transaction first, so that we know where to check status
	
			// get an eventhub once the fabric client has a user assigned. The user
			// is required bacause the event registration must be signed
			/*let event_hub = fabric_client.newEventHub();
			event_hub.setPeerAddr('grpc://localhost:8053');
	
			// using resolve the promise so that result status may be processed
			// under the then clause rather than having the catch clause process
			// the status
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					event_hub.disconnect();
					resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
				}, 3000);
				event_hub.connect();
				event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
					// this is the callback for transaction event status
					// first some clean up of event listener
					clearTimeout(handle);
					event_hub.unregisterTxEvent(transaction_id_string);
					event_hub.disconnect();
	
					// now let the application know what happened
					var return_status = {event_status : code, tx_id : transaction_id_string};
					if (code !== 'VALID') {
						console.error('The transaction was invalid, code = ' + code);
						resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
					} else {
						console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
						resolve(return_status);
					}
				}, (err) => {
					//this is the callback if something goes wrong with the event registration or processing
					reject(new Error('There was a problem with the eventhub ::'+err));
				});
			});
			promises.push(txPromise);
	
			return Promise.all(promises);*/
			res.send({code:"200", message: "Added Organization successsfully."});
		} else {
			console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	/*}).then((results) => {
		console.log('Send transaction promise and event listener promise have completed',results);
		// check the results in the order the promises were added to the promise all list
		if (results && results[0] && results[0].status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		} else {
			//console.error('Failed to order the transaction. Error code: ' + response.status);
			res.send({code:"500", message: "Add Organization failed."});
		}
	
		if(results && results[1] && results[1].event_status === 'VALID') {
			console.log('Successfully committed the change to the ledger by the peer');
			res.send({code:"200", message: "Added Organization successsfully."});
		} else {
			console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
		}*/
	}).catch((err) => {
		console.error('Failed to invoke successfully :: ' + err);
		res.send({code:"500", message: "Add Organization failed."});
	});
	}

// // Request LC by Buyer
function requestLC(req, res) {

//Init fabric client
var fabric_client = new Fabric_Client();

// setup the fabric network
var channel = fabric_client.newChannel('tfbcchannel');
var order = fabric_client.newOrderer('grpc://localhost:7050')
channel.addOrderer(order);

//add buyer peer
var peer = fabric_client.newPeer('grpc://localhost:8051');
channel.addPeer(peer);

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {

	
	
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('buyerUser', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded buyerUser from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get buyerUser.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
	// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
	// must send the proposal to endorsing peers
	var request = {chaincodeId: 'tfbccc',
		fcn: 'requestLC',
		args: [req.body.lcId, req.body.expiryDate, req.body.buyer, req.body.imbank, req.body.seller, req.body.exbank,req.body.amount],
		chainId: 'tfbcchannel',
		txId: tx_id};

	// send the transaction proposal to the peers
	return channel.sendTransactionProposal(request);
}).then((results) => {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise);
		
		res.send({code:"200", message: "LC requested successsfully."});
		//we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
		/*let event_hub = fabric_client.newEventHub();
		event_hub.setPeerAddr('grpc://localhost:8053');

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, 3000);
			event_hub.connect();
			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);
				event_hub.unregisterTxEvent(transaction_id_string);
				event_hub.disconnect();

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
		});
		promises.push(txPromise);

		return Promise.all(promises);*/
	} else {
		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
/*}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + response.status);
		res.send({code:"500", message: "LC request failed."});
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
		res.send({code:"200", message: "LC requested successsfully."});
	} else {
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}*/
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err);
	res.send({code:"500", message: "LC request failed."});
});
}

// Issue LC by Bank
function issueLC(req, res) {

		//Init fabric client
		var fabric_client = new Fabric_Client();
	
		// setup the fabric network
		var channel = fabric_client.newChannel('tfbcchannel');
		var order = fabric_client.newOrderer('grpc://localhost:7050')
		channel.addOrderer(order);
		
		//add buyer peer
		var peer = fabric_client.newPeer('grpc://localhost:7051');
		channel.addPeer(peer);	

	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
	

		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// get a transaction id object based on the current user assigned to fabric client
		tx_id = fabric_client.newTransactionID();
		console.log("Assigning transaction_id: ", tx_id._transaction_id);
	
		// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
		// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
		// must send the proposal to endorsing peers
		var request = {chaincodeId: 'tfbccc',
	fcn: 'issueLC',
	args: [req.body.lcId],
	chainId: 'tfbcchannel',
	txId: tx_id};
	
		// send the transaction proposal to the peers
		return channel.sendTransactionProposal(request);
	}).then((results) => {
		var proposalResponses = results[0];
		var proposal = results[1];
		let isProposalGood = false;
		if (proposalResponses && proposalResponses[0].response &&
			proposalResponses[0].response.status === 200) {
				isProposalGood = true;
				console.log('Transaction proposal was good');
			} else {
				console.error('Transaction proposal was bad');
			}
		if (isProposalGood) {
			console.log(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
				proposalResponses[0].response.status, proposalResponses[0].response.message));
	
			// build up the request for the orderer to have the transaction committed
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
	
			// set the transaction listener and set a timeout of 30 sec
			// if the transaction did not get committed within the timeout period,
			// report a TIMEOUT status
			var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
			var promises = [];
	
			var sendPromise = channel.sendTransaction(request);
			promises.push(sendPromise); 
			res.send({code:"200", message: "LC issued successsfully."});
			//we want the send transaction first, so that we know where to check status
	
			// get an eventhub once the fabric client has a user assigned. The user
			// is required bacause the event registration must be signed
			/*let event_hub = fabric_client.newEventHub();
			event_hub.setPeerAddr('grpc://localhost:7053');
	
			// using resolve the promise so that result status may be processed
			// under the then clause rather than having the catch clause process
			// the status
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					event_hub.disconnect();
					resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
				}, 3000);
				event_hub.connect();
				event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
					// this is the callback for transaction event status
					// first some clean up of event listener
					clearTimeout(handle);
					event_hub.unregisterTxEvent(transaction_id_string);
					event_hub.disconnect();
	
					// now let the application know what happened
					var return_status = {event_status : code, tx_id : transaction_id_string};
					if (code !== 'VALID') {
						console.error('The transaction was invalid, code = ' + code);
						resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
					} else {
						console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
						resolve(return_status);
					}
				}, (err) => {
					//this is the callback if something goes wrong with the event registration or processing
					reject(new Error('There was a problem with the eventhub ::'+err));
				});
			});
			promises.push(txPromise);
	
			return Promise.all(promises);*/
		} else {
			console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	/*}).then((results) => {
		console.log('Send transaction promise and event listener promise have completed');
		// check the results in the order the promises were added to the promise all list
		if (results && results[0] && results[0].status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		} else {
			console.error('Failed to order the transaction. Error code: ' + response.status);
			res.send({code:"500", message: "LC issue failed."});
		}
	
		if(results && results[1] && results[1].event_status === 'VALID') {
			console.log('Successfully committed the change to the ledger by the peer');
			res.send({code:"200", message: "LC issued successsfully."});
		} else {
			console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
		}*/
	}).catch((err) => {
		console.error('Failed to invoke successfully :: ' + err.stack);
		res.send({code:"500", message: "LC issue failed."});
	});
	}

// Accept LC by Seller
function acceptLC(req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:9051');
	channel.addPeer(peer);

	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
	
		
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('sellerUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded sellerUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get sellerUser.... run registerUser.js');
		}
	
		// get a transaction id object based on the current user assigned to fabric client
		tx_id = fabric_client.newTransactionID();
		console.log("Assigning transaction_id: ", tx_id._transaction_id);
	
		// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
		// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
		// must send the proposal to endorsing peers
		var request = {chaincodeId: 'tfbccc',
	fcn: 'acceptLC',
	args: [req.body.lcId],
	chainId: 'tfbcchannel',
	txId: tx_id};
	
		// send the transaction proposal to the peers
		return channel.sendTransactionProposal(request);
	}).then((results) => {
		var proposalResponses = results[0];
		var proposal = results[1];
		let isProposalGood = false;
		if (proposalResponses && proposalResponses[0].response &&
			proposalResponses[0].response.status === 200) {
				isProposalGood = true;
				console.log('Transaction proposal was good');
			} else {
				console.error('Transaction proposal was bad');
			}
		if (isProposalGood) {
			console.log(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
				proposalResponses[0].response.status, proposalResponses[0].response.message));
	
			// build up the request for the orderer to have the transaction committed
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
	
			// set the transaction listener and set a timeout of 30 sec
			// if the transaction did not get committed within the timeout period,
			// report a TIMEOUT status
			var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
			var promises = [];
	
			var sendPromise = channel.sendTransaction(request);
			promises.push(sendPromise); 
			res.send({code:"200", message: "LC accepted successsfully."});
			//we want the send transaction first, so that we know where to check status
	
			// get an eventhub once the fabric client has a user assigned. The user
			// is required bacause the event registration must be signed
			/*let event_hub = fabric_client.newEventHub();
			event_hub.setPeerAddr('grpc://localhost:9053');
	
			// using resolve the promise so that result status may be processed
			// under the then clause rather than having the catch clause process
			// the status
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					event_hub.disconnect();
					resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
				}, 3000);
				event_hub.connect();
				event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
					// this is the callback for transaction event status
					// first some clean up of event listener
					clearTimeout(handle);
					event_hub.unregisterTxEvent(transaction_id_string);
					event_hub.disconnect();
	
					// now let the application know what happened
					var return_status = {event_status : code, tx_id : transaction_id_string};
					if (code !== 'VALID') {
						console.error('The transaction was invalid, code = ' + code);
						resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
					} else {
						console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
						resolve(return_status);
					}
				}, (err) => {
					//this is the callback if something goes wrong with the event registration or processing
					reject(new Error('There was a problem with the eventhub ::'+err));
				});
			});
			promises.push(txPromise);
	
			return Promise.all(promises);*/
		} else {
			console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	/*}).then((results) => {
		console.log('Send transaction promise and event listener promise have completed');
		// check the results in the order the promises were added to the promise all list
		if (results && results[0] && results[0].status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		} else {
			console.error('Failed to order the transaction. Error code: ' + response.status);
			res.send({code:"500", message: "LC accept failed."});
		}
	
		if(results && results[1] && results[1].event_status === 'VALID') {
			console.log('Successfully committed the change to the ledger by the peer');
			res.send({code:"200", message: "LC accepted successsfully."});
		} else {
			console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
			res.send({code:"500", message: "LC accept failed."});
		}*/
	}).catch((err) => {
		console.error('Failed to invoke successfully :: ' + err);
		res.send({code:"500", message: "LC accept failed."});
	});
}

// Get current state of LC using Bank user
function getLC(req, res){
	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);


	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
		// queryAllCars chaincode function - requires no arguments , ex: args: [''],
		var request = {chaincodeId: 'tfbccc',
		fcn: 'getLC',
		args: [req.body.lcId],
		chainId: 'tfbcchannel',
		};
	
		// send the query proposal to the peer
		return channel.queryByChaincode(request);
	}).then((query_responses) => {
		console.log("Query has completed, checking results");
		// query_responses could have more than one  results if there multiple peers were used as targets
		if (query_responses && query_responses.length == 1) {
			if (query_responses[0] instanceof Error) {
				console.error("error from query = ", query_responses[0]);
				res.send({code:"500", data: "Issue with getting LC details"});
			} else {
				
				console.log("Response is ", query_responses[0].toString());
				res.send({code:"200", data: JSON.parse(query_responses[0].toString())});
			}
		} else {
			console.log("No payloads were returned from query");
			res.send({code:"500", data: "No LC found"});
		}
	}).catch((err) => {
		console.error('Failed to query successfully :: ' + err);
		res.send({code:"500", data: "Issue with getting LC details"});
	});
	
}

function getOrg(req, res){
	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);


	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
		// queryAllCars chaincode function - requires no arguments , ex: args: [''],
		var request = {chaincodeId: 'tfbccc',
		fcn: 'getOrg',
		args: [req.body.orgId],
		chainId: 'tfbcchannel',
		};
	
		// send the query proposal to the peer
		return channel.queryByChaincode(request);
	}).then((query_responses) => {
		console.log("Query has completed, checking results");
		// query_responses could have more than one  results if there multiple peers were used as targets
		if (query_responses && query_responses.length == 1) {
			if (query_responses[0] instanceof Error) {
				console.error("error from query = ", query_responses[0]);
				res.send({code:"500", data: "Issue with getting Org details"});
			} else {
				
				console.log("Response is ", query_responses[0].toString());
				res.send({code:"200", data: JSON.parse(query_responses[0].toString())});
			}
		} else {
			console.log("No payloads were returned from query");
			res.send({code:"500", data: "No Org found"});
		}
	}).catch((err) => {
		console.error('Failed to query successfully :: ' + err);
		res.send({code:"500", data: "Issue with getting Org details"});
	});
	
}

// Get current state of LC using Bank user
function getLCHistory(req, res){

	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);

	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		

		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
		// queryAllCars chaincode function - requires no arguments , ex: args: [''],
		var request = {chaincodeId: 'tfbccc',
		fcn: 'getLCHistory',
		args: [req.body.lcId],
		chainId: 'tfbcchannel',
		};
	
		// send the query proposal to the peer
		return channel.queryByChaincode(request);
	}).then((query_responses) => {
		console.log("Query has completed, checking results");
		// query_responses could have more than one  results if there multiple peers were used as targets
		if (query_responses && query_responses.length == 1) {
			if (query_responses[0] instanceof Error) {
				console.error("error from query = ", query_responses[0]);
				res.send({code:"500", message: "Issue with getting LC details"});
			} else {
				
				console.log("Response is ", query_responses[0].toString());
				res.send({code:"200", data: JSON.parse(query_responses[0].toString())});
			}
		} else {
			console.log("No payloads were returned from query");
			res.send({code:"500", message: "No LC found"});
		}
	}).catch((err) => {
		console.error('Failed to query successfully :: ' + err);
		res.send({code:"500", message: "Issue with getting LC details"});
	});
	
}

// Enter details of exports Items
function exporter(req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:9051');
	channel.addPeer(peer);

	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
	
		
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('sellerUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded sellerUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get sellerUser.... run registerUser.js');
		}
	
		// get a transaction id object based on the current user assigned to fabric client
		tx_id = fabric_client.newTransactionID();
		console.log("Assigning transaction_id: ", tx_id._transaction_id);
	
		// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
		// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
		// must send the proposal to endorsing peers
		var request = {chaincodeId: 'tfbccc',
	fcn: 'exporter',
	args: [req.body.lcID, req.body.shipmentID,req.body.description,req.body.shipmentValue,req.body.shipmentCo,req.body.poland,req.body.poentry],
	chainId: 'tfbcchannel',
	txId: tx_id};
	
		// send the transaction proposal to the peers
		console.log("Assigning transaction_id: ", request)
		return channel.sendTransactionProposal(request);
	}).then((results) => {
		var proposalResponses = results[0];
		var proposal = results[1];
		let isProposalGood = false;
		if (proposalResponses && proposalResponses[0].response &&
			proposalResponses[0].response.status === 200) {
				isProposalGood = true;
				console.log('Transaction proposal was good');
			} else {
				console.error('Transaction proposal was bad');
			}
		if (isProposalGood) {
			console.log(util.format(
				'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
				proposalResponses[0].response.status, proposalResponses[0].response.message));
	
			// build up the request for the orderer to have the transaction committed
			var request = {
				proposalResponses: proposalResponses,
				proposal: proposal
			};
	
			// set the transaction listener and set a timeout of 30 sec
			// if the transaction did not get committed within the timeout period,
			// report a TIMEOUT status
			var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
			var promises = [];
	
			var sendPromise = channel.sendTransaction(request);
			promises.push(sendPromise); 
			res.send({code:"200", message: "exporter details accepted successsfully."});
			//we want the send transaction first, so that we know where to check status
	
			// get an eventhub once the fabric client has a user assigned. The user
			// is required bacause the event registration must be signed
			/*let event_hub = fabric_client.newEventHub();
			event_hub.setPeerAddr('grpc://localhost:9053');
	
			// using resolve the promise so that result status may be processed
			// under the then clause rather than having the catch clause process
			// the status
			let txPromise = new Promise((resolve, reject) => {
				let handle = setTimeout(() => {
					event_hub.disconnect();
					resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
				}, 3000);
				event_hub.connect();
				event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
					// this is the callback for transaction event status
					// first some clean up of event listener
					clearTimeout(handle);
					event_hub.unregisterTxEvent(transaction_id_string);
					event_hub.disconnect();
	
					// now let the application know what happened
					var return_status = {event_status : code, tx_id : transaction_id_string};
					if (code !== 'VALID') {
						console.error('The transaction was invalid, code = ' + code);
						resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
					} else {
						console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
						resolve(return_status);
					}
				}, (err) => {
					//this is the callback if something goes wrong with the event registration or processing
					reject(new Error('There was a problem with the eventhub ::'+err));
				});
			});
			promises.push(txPromise);
	
			return Promise.all(promises);*/
		} else {
			console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
			throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		}
	/*}).then((results) => {
		console.log('Send transaction promise and event listener promise have completed');
		// check the results in the order the promises were added to the promise all list
		if (results && results[0] && results[0].status === 'SUCCESS') {
			console.log('Successfully sent transaction to the orderer.');
		} else {
			console.error('Failed to order the transaction. Error code: ' + response.status);
			res.send({code:"500", message: "Exporter details accept failed."});
		}
	
		if(results && results[1] && results[1].event_status === 'VALID') {
			console.log('Successfully committed the change to the ledger by the peer');
			res.send({code:"200", message: "exporter details accepted successsfully."});
		} else {
			console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
			res.send({code:"500", message: "exporter details accept failed."});
		}*/
	}).catch((err) => {
		console.error('Failed to invoke successfully :: ' + err);
		res.send({code:"500", message: "exporter details accept failed."});
	});
}

// Get current state of shipment status
function getSH(req, res){
	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:5051');
	channel.addPeer(peer);


	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('customesUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded customesUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get customesUser.... run registerUser.js');
		}
	
		// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
		// queryAllCars chaincode function - requires no arguments , ex: args: [''],
		var request = {chaincodeId: 'tfbccc',
		fcn: 'customes',
		args: [req.body.shId],
		chainId: 'tfbcchannel',
		};
	
		// send the query proposal to the peer
		return channel.queryByChaincode(request);
	}).then((query_responses) => {
		console.log("Query has completed, checking results");
		// query_responses could have more than one  results if there multiple peers were used as targets
		if (query_responses && query_responses.length == 1) {
			if (query_responses[0] instanceof Error) {
				console.error("error from query = ", query_responses[0]);
				res.send({code:"500", data: "Issue with getting shipment  details"});
			} else {
				
				console.log("Response is ", query_responses[0].toString());
				res.send({code:"200", data: JSON.parse(query_responses[0].toString())});
			}
		} else {
			console.log("No payloads were returned from query");
			res.send({code:"500", data: "No shipment details found"});
		}
	}).catch((err) => {
		console.error('Failed to query successfully :: ' + err);
		res.send({code:"500", data: "Issue with getting shipment details"});
	});
	
}

// Approve the shipment process
function customesApprove(req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();

	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);	

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {


	
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('bankUser', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded customesUser from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get customesUser.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
	// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
	// must send the proposal to endorsing peers
	var request = {chaincodeId: 'tfbccc',
fcn: 'customesApprove',
args: [req.body.shId],
chainId: 'tfbcchannel',
txId: tx_id};

	// send the transaction proposal to the peers
	return channel.sendTransactionProposal(request);
}).then((results) => {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise); 
		res.send({code:"200", message: "customes aprroves  successsfully."})
		//we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
		/*let event_hub = fabric_client.newEventHub();
		event_hub.setPeerAddr('grpc://localhost:7053');

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, 3000);
			event_hub.connect();
			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);
				event_hub.unregisterTxEvent(transaction_id_string);
				event_hub.disconnect();

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
		});
		promises.push(txPromise);

		return Promise.all(promises);*/
	} else {
		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
/*}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + response.status);
		res.send({code:"500", message: "customes approve failed."});
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
		res.send({code:"200", message: "customes aprroves  successsfully."});
	} else {
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}*/
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err.stack);
	res.send({code:"500", message: "customes approve failed."});
});
}

// Reject the shipment process
function customesReject(req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();

	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);	

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {


	
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('bankUser', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded customesUser from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get customesUser.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
	// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
	// must send the proposal to endorsing peers
	var request = {chaincodeId: 'tfbccc',
fcn: 'customesReject',
args: [req.body.shId],
chainId: 'tfbcchannel',
txId: tx_id};

	// send the transaction proposal to the peers
	return channel.sendTransactionProposal(request);
}).then((results) => {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise); 
		res.send({code:"200", message: "customes rejected  successsfully."});
		//we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
		/*let event_hub = fabric_client.newEventHub();
		event_hub.setPeerAddr('grpc://localhost:7053');

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, 3000);
			event_hub.connect();
			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);
				event_hub.unregisterTxEvent(transaction_id_string);
				event_hub.disconnect();

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
		});
		promises.push(txPromise);

		return Promise.all(promises);*/
	} else {
		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
/*}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + response.status);
		res.send({code:"500", message: "customes reject failed."});
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
		res.send({code:"200", message: "customes rejected  successsfully."});
	} else {
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}*/
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err.stack);
	res.send({code:"500", message: "customes reject failed."});
});
}

// Recevied the goods
function importer(req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();

	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:8051');
	channel.addPeer(peer);	

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {


	
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('buyerUser', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded buyerUser from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get buyerUser.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
	// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
	// must send the proposal to endorsing peers
	var request = {chaincodeId: 'tfbccc',
fcn: 'importer',
args: [req.body.shId],
chainId: 'tfbcchannel',
txId: tx_id};

	// send the transaction proposal to the peers
	return channel.sendTransactionProposal(request);
}).then((results) => {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise); 
		res.send({code:"200", message: "Importer received the goods  successsfully."});
		//we want the send transaction first, so that we know where to check status

		// get an eventhub once the fabric client has a user assigned. The user
		// is required bacause the event registration must be signed
		/*let event_hub = fabric_client.newEventHub();
		event_hub.setPeerAddr('grpc://localhost:7053');

		// using resolve the promise so that result status may be processed
		// under the then clause rather than having the catch clause process
		// the status
		let txPromise = new Promise((resolve, reject) => {
			let handle = setTimeout(() => {
				event_hub.disconnect();
				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
			}, 3000);
			event_hub.connect();
			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
				// this is the callback for transaction event status
				// first some clean up of event listener
				clearTimeout(handle);
				event_hub.unregisterTxEvent(transaction_id_string);
				event_hub.disconnect();

				// now let the application know what happened
				var return_status = {event_status : code, tx_id : transaction_id_string};
				if (code !== 'VALID') {
					console.error('The transaction was invalid, code = ' + code);
					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
				} else {
					console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
					resolve(return_status);
				}
			}, (err) => {
				//this is the callback if something goes wrong with the event registration or processing
				reject(new Error('There was a problem with the eventhub ::'+err));
			});
		});
		promises.push(txPromise);

		return Promise.all(promises);*/
	} else {
		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
	}
/*}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + response.status);
		res.send({code:"500", message: "recieved the goods failed."});
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
		res.send({code:"200", message: "Importer received the goods  successsfully."});
	} else {
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}*/
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err.stack);
	res.send({code:"500", message: "Importer received the goods failed."});
});
}

function upload (req, res) {

	//Init fabric client
	var fabric_client = new Fabric_Client();

	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:8051');
	channel.addPeer(peer);	

Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {


	
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext('buyerUser', true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
		console.log('Successfully loaded buyerUser from persistence');
		member_user = user_from_store;
	} else {
		throw new Error('Failed to get buyerUser.... run registerUser.js');
	}

	// get a transaction id object based on the current user assigned to fabric client
	tx_id = fabric_client.newTransactionID();
	console.log("Assigning transaction_id: ", tx_id._transaction_id);

	//Reading file from computer
	//console.log(req)
	let testFile = fs.readFileSync(req.file.path);
	//Creating buffer for ipfs function to add file to the system
	let testBuffer = new Buffer(testFile);
	return testBuffer;
}).then((testBuffer) =>{
	//upload(req, res, function(err) {
	// if(err) {
	//   console.log('Error Occured');
	//    return;
	//  }
	//});
	//console.log (testFile);
	//let file = " "
	return ipfs.files.add(testBuffer, function (err, file1) {
	if (err) {
			console.log(err);
			throw new Error("IPFs upload failed")
	}
	else 
	{
			console.log(file1);
			var request = {chaincodeId: 'tfbccc',
            fcn: 'upload',
            args: [req.body.ShipmentID,file1[0].hash],
            chainId: 'tfbcchannel',
            txId: tx_id};
	
	console.log("Request: ", request);
	 channel.sendTransactionProposal(request).then((data)=>{
		execu(res,data,channel,tx_id)
	 }).catch((err) => {
		console.error('Failed to invoke successfully :: ' + err.stack);
		res.send({code:"500", message: "Upload of document  failed."});
	});
	}

	// send the transaction proposal to the peers
	
	})

	//console.log (file.path);

	// createCar chaincode function - requires 5 args, ex: args: ['CAR12', 'Honda', 'Accord', 'Black', 'Tom'],
	// changeCarOwner chaincode function - requires 2 args , ex: args: ['CAR10', 'Dave'],
	// must send the proposal to endorsing peers
	
// }).then((results) => {
// 	var proposalResponses = results[0];
// 	var proposal = results[1];
// 	let isProposalGood = false;
// 	if (proposalResponses && proposalResponses[0].response &&
// 		proposalResponses[0].response.status === 200) {
// 			isProposalGood = true;
// 			console.log('Transaction proposal was good');
// 		} else {
// 			console.error('Transaction proposal was bad');
// 		}
// 	if (isProposalGood) {
// 		console.log(util.format(
// 			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
// 			proposalResponses[0].response.status, proposalResponses[0].response.message));

// 		// build up the request for the orderer to have the transaction committed
// 		var request = {
// 			proposalResponses: proposalResponses,
// 			proposal: proposal
// 		};

// 		// set the transaction listener and set a timeout of 30 sec
// 		// if the transaction did not get committed within the timeout period,
// 		// report a TIMEOUT status
// 		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
// 		var promises = [];

// 		var sendPromise = channel.sendTransaction(request);
// 		promises.push(sendPromise); 
// 		res.send({code:"200", message: "Importer received the goods  successsfully."});
// 		//we want the send transaction first, so that we know where to check status

// 		// get an eventhub once the fabric client has a user assigned. The user
// 		// is required bacause the event registration must be signed
// 		/*let event_hub = fabric_client.newEventHub();
// 		event_hub.setPeerAddr('grpc://localhost:7053');

// 		// using resolve the promise so that result status may be processed
// 		// under the then clause rather than having the catch clause process
// 		// the status
// 		let txPromise = new Promise((resolve, reject) => {
// 			let handle = setTimeout(() => {
// 				event_hub.disconnect();
// 				resolve({event_status : 'TIMEOUT'}); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
// 			}, 3000);
// 			event_hub.connect();
// 			event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
// 				// this is the callback for transaction event status
// 				// first some clean up of event listener
// 				clearTimeout(handle);
// 				event_hub.unregisterTxEvent(transaction_id_string);
// 				event_hub.disconnect();

// 				// now let the application know what happened
// 				var return_status = {event_status : code, tx_id : transaction_id_string};
// 				if (code !== 'VALID') {
// 					console.error('The transaction was invalid, code = ' + code);
// 					resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
// 				} else {
// 					console.log('The transaction has been committed on peer ' + event_hub._ep._endpoint.addr);
// 					resolve(return_status);
// 				}
// 			}, (err) => {
// 				//this is the callback if something goes wrong with the event registration or processing
// 				reject(new Error('There was a problem with the eventhub ::'+err));
// 			});
// 		});
// 		promises.push(txPromise);

// 		return Promise.all(promises);*/
// 	} else {
// 		console.error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
// 		throw new Error('Failed to send Proposal or receive valid response. Response null or status is not 200. exiting...');
// 	}
/*}).then((results) => {
	console.log('Send transaction promise and event listener promise have completed');
	// check the results in the order the promises were added to the promise all list
	if (results && results[0] && results[0].status === 'SUCCESS') {
		console.log('Successfully sent transaction to the orderer.');
	} else {
		console.error('Failed to order the transaction. Error code: ' + response.status);
		res.send({code:"500", message: "recieved the goods failed."});
	}

	if(results && results[1] && results[1].event_status === 'VALID') {
		console.log('Successfully committed the change to the ledger by the peer');
		res.send({code:"200", message: "Importer received the goods  successsfully."});
	} else {
		console.log('Transaction failed to be committed to the ledger due to ::'+results[1].event_status);
	}*/
}).catch((err) => {
	console.error('Failed to invoke successfully :: ' + err.stack);
	res.send({code:"500", message: "Upload of document failed."});
});
}

function execu(res,results,channel,tx_id) {
	var proposalResponses = results[0];
	var proposal = results[1];
	let isProposalGood = false;
	if (proposalResponses && proposalResponses[0].response &&
		proposalResponses[0].response.status === 200) {
			isProposalGood = true;
			console.log('Transaction proposal was good');
		} else {
			console.error('Transaction proposal was bad');
			res.send({code:"500", message: " Failed to upload the file."});

		}
	if (isProposalGood) {
		console.log(util.format(
			'Successfully sent Proposal and received ProposalResponse: Status - %s, message - "%s"',
			proposalResponses[0].response.status, proposalResponses[0].response.message));

		// build up the request for the orderer to have the transaction committed
		var request = {
			proposalResponses: proposalResponses,
			proposal: proposal
		};

		// set the transaction listener and set a timeout of 30 sec
		// if the transaction did not get committed within the timeout period,
		// report a TIMEOUT status
		var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
		var promises = [];

		var sendPromise = channel.sendTransaction(request);
		promises.push(sendPromise); 
		res.send({code:"200", message: "Successsfully uploaded the file "});
	}
}


// Get current state of shipment using Bank user
function getStatus(req, res){
	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);


	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
		// queryAllCars chaincode function - requires no arguments , ex: args: [''],
		var request = {chaincodeId: 'tfbccc',
		fcn: 'getLC',
		args: [req.body.shId],
		chainId: 'tfbcchannel',
		};
	
		// send the query proposal to the peer
		return channel.queryByChaincode(request);
	}).then((query_responses) => {
		console.log("Query has completed, checking results");
		// query_responses could have more than one  results if there multiple peers were used as targets
		if (query_responses && query_responses.length == 1) {
			if (query_responses[0] instanceof Error) {
				console.error("error from query = ", query_responses[0]);
				res.send({code:"500", data: "Issue with getting shipping details"});
			} else {
				
				console.log("Response is ", query_responses[0].toString());
				res.send({code:"200", data: JSON.parse(query_responses[0].toString())});
			}
		} else {
			console.log("No payloads were returned from query");
			res.send({code:"500", data: "No LC found"});
		}
	}).catch((err) => {
		console.error('Failed to query successfully :: ' + err);
		res.send({code:"500", data: "Issue with getting shipping details"});
	});
}

// Get current state of shipment using Bank user
function view(req, res){
	//Init fabric client
	var fabric_client = new Fabric_Client();
	
	// setup the fabric network
	var channel = fabric_client.newChannel('tfbcchannel');
	var order = fabric_client.newOrderer('grpc://localhost:7050')
	channel.addOrderer(order);
	
	//add buyer peer
	var peer = fabric_client.newPeer('grpc://localhost:7051');
	channel.addPeer(peer);


	Fabric_Client.newDefaultKeyValueStore({ path: store_path
	}).then((state_store) => {
		
		// assign the store to the fabric client
		fabric_client.setStateStore(state_store);
		var crypto_suite = Fabric_Client.newCryptoSuite();
		// use the same location for the state store (where the users' certificate are kept)
		// and the crypto store (where the users' keys are kept)
		var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
		crypto_suite.setCryptoKeyStore(crypto_store);
		fabric_client.setCryptoSuite(crypto_suite);
	
		// get the enrolled user from persistence, this user will sign all requests
		return fabric_client.getUserContext('bankUser', true);
	}).then((user_from_store) => {
		if (user_from_store && user_from_store.isEnrolled()) {
			console.log('Successfully loaded bankUser from persistence');
			member_user = user_from_store;
		} else {
			throw new Error('Failed to get bankUser.... run registerUser.js');
		}
	
		// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
		// queryAllCars chaincode function - requires no arguments , ex: args: [''],
		var request = {chaincodeId: 'tfbccc',
		fcn: 'view',
		args: [req.body.shId],
		chainId: 'tfbcchannel',
		};
	
		// send the query proposal to the peer
		return channel.queryByChaincode(request);
	}).then((query_responses) => {
		console.log("Query has completed, checking results");
		// query_responses could have more than one  results if there multiple peers were used as targets
		if (query_responses && query_responses.length == 1) {
			if (query_responses[0] instanceof Error) {
				console.error("error from query = ", query_responses[0]);
				res.send({code:"500", data: "Issue with getting file details"});
			} else {
				
				console.log("Response is ", query_responses[0].toString());
				res.send({code:"200", data: JSON.parse(query_responses[0].toString())});
			}
		} else {
			console.log("No payloads were returned from query");
			res.send({code:"500", data: "No file found"});
		}
	}).catch((err) => {
		console.error('Failed to query successfully :: ' + err);
		res.send({code:"500", data: "Issue with getting file details"});
	});
}

let tfbc = {
	requestLC: requestLC,
	issueLC: issueLC,
	acceptLC: acceptLC,
	getLC: getLC,
	getLCHistory: getLCHistory,
	exporter: exporter,
	getSH: getSH,
	customesApprove: customesApprove,
	customesReject: customesReject,
	importer: importer,
	getStatus: getStatus,
	addOrg: addOrg,
	getOrg: getOrg,
	upload: upload,
	view : view 
}

module.exports = tfbc;