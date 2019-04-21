/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * The sample smart contract for documentation topic:
 * Trade Finance Use Case - WORK IN  PROGRESS
 */

package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

// Define the Smart Contract structure
type SmartContract struct {
}

// Define the letter of credit
type LetterOfCredit struct {
	LCId       string `json:"lcId"`
	ExpiryDate string `json:"expiryDate"`
	Buyer      string `json:"buyer"`
	ImBank     string `json:"imbank"`
	Seller     string `json:"seller"`
	ExBank     string `jsin:"exbank"`
	Amount     int    `json:"amount"`
	Status     string `json:"status"`
}

// Define the shipment status
type Shipment struct {
	ShipmentID     string `json:"ShipmentID"`
	LCId           string `json:"lcId"`
	Description    string `json:"Description"`
	ShipmentValue  string `json:"ShipmentValue"`
	Exbank         string `json:"Exbank"`
	Imbank         string `json:"Imbank"`
	ShipmentCo     string `json:"ShiptmentCo"`
	Poland         string `json:"Poland"`
	Poentry        string `json:"Poentry"`
	Shipmentstatus string `json:"Shipmentstatus"`
	CustomesCharge string `json:"CustomesCharge"`
}

//Track the status of shipment
type Status struct {
	Exporter string `json:"Exporter"`
	Customes string `json:"Customes"`
	Importer string `json:"Importer"`
	Payment  string `json:"Payment"`
}

type Organisation struct {
	BankId string `json:"BankID"`
	Token  string `json:"Token"`
}

type file struct {
	ShipmentId string `json:"ShipmentId`
	Hash       string `json:"Hash"`
}

func (s *SmartContract) Init(APIstub shim.ChaincodeStubInterface) sc.Response {
	return shim.Success(nil)
}

func (s *SmartContract) Invoke(APIstub shim.ChaincodeStubInterface) sc.Response {

	// Retrieve the requested Smart Contract function and arguments
	function, args := APIstub.GetFunctionAndParameters()
	fmt.Println("function -> ", function)
	// Route to the appropriate handler function to interact with the ledger appropriately
	if function == "requestLC" {
		return s.requestLC(APIstub, args)
	} else if function == "issueLC" {
		return s.issueLC(APIstub, args)
	} else if function == "acceptLC" {
		return s.acceptLC(APIstub, args)
	} else if function == "exporter" {
		return s.exporter(APIstub, args)
	} else if function == "getLC" {
		return s.getLC(APIstub, args)
	} else if function == "customes" {
		return s.customes(APIstub, args)
	} else if function == "customesApprove" {
		return s.customesApprove(APIstub, args)
	} else if function == "customesReject" {
		return s.customesReject(APIstub, args)
	} else if function == "importer" {
		return s.importer(APIstub, args)
	} else if function == "getStatus" {
		return s.getStatus(APIstub, args)
	} else if function == "getLCHistory" {
		return s.getLCHistory(APIstub, args)
	} else if function == "addOrg" {
		return s.addOrg(APIstub, args)
	} else if function == "getOrg" {
		return s.getOrg(APIstub, args)
	} else if function == "upload" {
		return s.upload(APIstub, args)
	} else if function == "view" {
		return s.view(APIstub, args)
	}

	return shim.Error("Invalid Smart Contract function name.")
}

// This function is initiate by Buyer
func (s *SmartContract) requestLC(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	lcId := args[0]
	expiryDate := args[1]
	buyer := args[2]
	imbank := args[3]
	seller := args[4]
	exbank := args[5]
	amount, err := strconv.Atoi(args[6])
	if err != nil {
		return shim.Error("Not able to parse Amount")
	}

	LC := LetterOfCredit{LCId: lcId, ExpiryDate: expiryDate, Buyer: buyer, ImBank: imbank, Seller: seller, ExBank: exbank, Amount: amount, Status: "Requested"}
	LCBytes, err := json.Marshal(LC)

	APIstub.PutState(lcId, LCBytes)
	fmt.Println("LC Requested -> ", LC)

	return shim.Success(nil)
}

// This function is initiate by Seller
func (s *SmartContract) issueLC(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	lcId := args[0]

	// if err != nil {
	// 	return shim.Error("No Amount")
	// }

	LCAsBytes, _ := APIstub.GetState(lcId)

	var lc LetterOfCredit

	err := json.Unmarshal(LCAsBytes, &lc)

	if err != nil {
		return shim.Error("Issue with LC json unmarshaling")
	}

	LC := LetterOfCredit{LCId: lc.LCId, ExpiryDate: lc.ExpiryDate, Buyer: lc.Buyer, ImBank: lc.ImBank, Seller: lc.Seller, ExBank: lc.ExBank, Amount: lc.Amount, Status: "Issued"}
	LCBytes, err := json.Marshal(LC)

	if err != nil {
		return shim.Error("Issue with LC json marshaling")
	}

	APIstub.PutState(lc.LCId, LCBytes)
	fmt.Println("LC Issued -> ", LCBytes)

	return shim.Success(nil)
}

func (s *SmartContract) acceptLC(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	lcId := args[0]

	LCAsBytes, _ := APIstub.GetState(lcId)

	var lc LetterOfCredit

	err := json.Unmarshal(LCAsBytes, &lc)

	if err != nil {
		return shim.Error("Issue with LC json unmarshaling")
	}

	LC := LetterOfCredit{LCId: lc.LCId, ExpiryDate: lc.ExpiryDate, Buyer: lc.Buyer, ImBank: lc.ImBank, Seller: lc.Seller, ExBank: lc.ExBank, Amount: lc.Amount, Status: "Accepted"}
	LCBytes, err := json.Marshal(LC)

	if err != nil {
		return shim.Error("Issue with LC json marshaling")
	}

	APIstub.PutState(lc.LCId, LCBytes)
	fmt.Println("LC Accepted -> ", LC)

	return shim.Success(nil)
}

func (s *SmartContract) exporter(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	lcId := args[0]
	shipmentId := args[1]
	description := args[2]
	shipmentValue := args[3]
	//exbank := args[4]
	//imbank :=args[5]
	shipmentCo := args[4]
	poland := args[5]
	poentry := args[6]
	shipmentstaus := "informed"

	//amount, err := strconv.Atoi(args[3])
	//if err != nil {
	//		return shim.Error("Not able to parse Amount")
	//	}
	customesCharge := strconv.Itoa(70)

	LCAsBytes, _ := APIstub.GetState(lcId)

	var lc LetterOfCredit

	err := json.Unmarshal(LCAsBytes, &lc)

	if err != nil {
		return shim.Error("Issue with LC json unmarshaling")
	}

	if (lc.LCId == lcId) && (lc.Status == "accepted") {

		return shim.Error("Letter of credit is not accepted")
	}

	SS := Shipment{ShipmentID: shipmentId, LCId: lcId, Description: description, ShipmentValue: shipmentValue,
		Exbank: lc.ExBank, Imbank: lc.ImBank, ShipmentCo: shipmentCo, Poland: poland, Poentry: poentry, Shipmentstatus: shipmentstaus, CustomesCharge: customesCharge}
	SSBytes, err := json.Marshal(SS)

	if err != nil {
		return shim.Error("Issue with Shipment json marshaling")
	}

	APIstub.PutState(shipmentId, SSBytes)
	fmt.Println("Shipment process Initiated by Exporter -> ", SSBytes)

	ST := Status{Exporter: "Completed", Customes: "Not Verified", Importer: "Not recevied", Payment: "Not Initiated"}

	STBytes, err := json.Marshal(ST)

	if err != nil {
		return shim.Error("Issue with Status json marshaling")
	}

	APIstub.PutState(shipmentId+"ST", STBytes)
	return shim.Success(nil)
}

func (s *SmartContract) customes(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	//lcId := args[0]
	shipmentId := args[0]
	//description := args[2]
	//shipmentValue := args[3]
	//exbank := args[4]
	//imbank :=args[5]
	//shipmentCo := args[4]
	//poland := args[5]
	//poentry := args[6]
	//shipmentstaus := "informed"

	SCAsBytes, _ := APIstub.GetState(shipmentId)

	//var sc Shipment

	//err := json.Unmarshal(SCAsBytes, &sc)

	//if err != nil {
	//	return shim.Error("Issue with Shipment json unmarshaling")
	//}

	/*if (lc.LCId == lcId) && (lc.Status == "accepted") {

		   return shim.Error("Letter of credit is not accepted")
	   }*/

	//SS := Shipment{ShipmentID: shipmentId, LCId: lcId, Description: description, ShipmentValue: shipmentValue,
	//	Exbank: lc.ExBank, Imbank: lc.ImBank, ShipmentCo: shipmentCo, Poland: poland, Poentry: poentry, Shipmentstatus: shipmentstaus}
	//SSBytes, err := json.Marshal(SS)

	//if err != nil {
	//	return shim.Error("Issue with Shipment json marshaling")
	//}

	//APIstub.PutState(shipmentId, SSBytes)
	//fmt.Println("Shipment process Initiated by Exporter -> ", SS)
	fmt.Println("Shipment process Initiated by Exporter -> ", SCAsBytes)

	return shim.Success(SCAsBytes)
}

func (s *SmartContract) customesApprove(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	shipmentId := args[0]

	SCAsBytes, _ := APIstub.GetState(shipmentId)

	var sc Shipment

	err := json.Unmarshal(SCAsBytes, &sc)

	if err != nil {
		return shim.Error("Issue with Shipment json unmarshaling")
	}

	SS := Shipment{ShipmentID: sc.ShipmentID, LCId: sc.LCId, Description: sc.Description, ShipmentValue: sc.ShipmentValue,
		Exbank: sc.Exbank, Imbank: sc.Imbank, ShipmentCo: sc.ShipmentCo, Poland: sc.Poland, Poentry: sc.Poentry, Shipmentstatus: "customes Approved", CustomesCharge: "0"}
	SSBytes, err := json.Marshal(SS)

	if err != nil {
		return shim.Error("Issue with Shipment json marshaling")
	}

	APIstub.PutState(shipmentId, SSBytes)
	fmt.Println("Shipment process approved by customes -> ", SS)

	ST := Status{Exporter: "Completed", Customes: "Verified", Importer: "Not recevied", Payment: "Not Initiated"}

	STBytes, err := json.Marshal(ST)

	if err != nil {
		return shim.Error("Issue with Status json marshaling")
	}

	fmt.Println("Shipment process approved by customes -> ", STBytes)

	APIstub.PutState(shipmentId+"ST", STBytes)

	return shim.Success(nil)
}

func (s *SmartContract) customesReject(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	shipmentId := args[0]

	SCAsBytes, _ := APIstub.GetState(shipmentId)

	var sc Shipment

	err := json.Unmarshal(SCAsBytes, &sc)

	if err != nil {
		return shim.Error("Issue with Shipment json unmarshaling")
	}

	SS := Shipment{ShipmentID: sc.ShipmentID, LCId: sc.LCId, Description: sc.Description, ShipmentValue: sc.ShipmentValue,
		Exbank: sc.Exbank, Imbank: sc.Imbank, ShipmentCo: sc.ShipmentCo, Poland: sc.Poland, Poentry: sc.Poentry, Shipmentstatus: "customes Rejected", CustomesCharge: "0"}
	SSBytes, err := json.Marshal(SS)

	if err != nil {
		return shim.Error("Issue with Shipment json marshaling")
	}

	APIstub.PutState(shipmentId, SSBytes)
	fmt.Println("Shipment process Rejected by customes -> ", SS)

	ST := Status{Exporter: "Completed", Customes: "Rejected", Importer: "Not recevied", Payment: "Not Initiated"}

	STBytes, err := json.Marshal(ST)

	if err != nil {
		return shim.Error("Issue with Status json marshaling")
	}

	fmt.Println("Shipment process Rejected by customes -> ", STBytes)
	APIstub.PutState(shipmentId+"ST", STBytes)

	return shim.Success(nil)
}

func (s *SmartContract) importer(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	shipmentId := args[0]

	SCAsBytes, _ := APIstub.GetState(shipmentId)

	var sc Shipment

	err := json.Unmarshal(SCAsBytes, &sc)

	if err != nil {
		return shim.Error("Issue with Shipment json unmarshaling")
	}

	SS := Shipment{ShipmentID: sc.ShipmentID, LCId: sc.LCId, Description: sc.Description, ShipmentValue: sc.ShipmentValue,
		Exbank: sc.Exbank, Imbank: sc.Imbank, ShipmentCo: sc.ShipmentCo, Poland: sc.Poland, Poentry: sc.Poentry, Shipmentstatus: "Goods received", CustomesCharge: "0"}
	SSBytes, err := json.Marshal(SS)

	if err != nil {
		return shim.Error("Issue with Shipment json marshaling")
	}

	APIstub.PutState(shipmentId, SSBytes)
	fmt.Println("Goods received by Buyer -> ", SS)

	imbank := sc.Imbank
	exbank := sc.Exbank

	IMAsBytes, _ := APIstub.GetState(imbank)

	var im Organisation

	err = json.Unmarshal(IMAsBytes, &im)

	if err != nil {
		return shim.Error("Issue with Organization json unmarshaling")
	}

	EXAsBytes, _ := APIstub.GetState(exbank)

	var ex Organisation

	err = json.Unmarshal(EXAsBytes, &ex)

	if err != nil {
		return shim.Error("Issue with Organization json unmarshaling")
	}

	exToken, err := strconv.Atoi(ex.Token)
	imToken, err := strconv.Atoi(im.Token)
	shipmentVal, err := strconv.Atoi(sc.ShipmentValue)

	ex.Token = strconv.Itoa(exToken + shipmentVal)
	im.Token = strconv.Itoa(imToken - shipmentVal)

	OR := Organisation{BankId: im.BankId, Token: im.Token}
	ORBytes, err := json.Marshal(OR)

	if err != nil {
		return shim.Error("Issue with organization json marshaling")
	}

	APIstub.PutState(im.BankId, ORBytes)
	fmt.Println("Organization Added -> ", OR)

	OR = Organisation{BankId: ex.BankId, Token: ex.Token}
	ORBytes, err = json.Marshal(OR)

	if err != nil {
		return shim.Error("Issue with organization json marshaling")
	}

	APIstub.PutState(ex.BankId, ORBytes)
	fmt.Println("Organization Added -> ", OR)

	ST := Status{Exporter: "Completed", Customes: "Verified", Importer: "recevied", Payment: "Transferred"}

	STBytes, err := json.Marshal(ST)

	if err != nil {
		return shim.Error("Issue with Status json marshaling")
	}

	APIstub.PutState(shipmentId+"ST", STBytes)

	return shim.Success(nil)
}

func (s *SmartContract) getLC(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	lcId := args[0]

	// if err != nil {
	// 	return shim.Error("No Amount")
	// }

	LCAsBytes, _ := APIstub.GetState(lcId)

	return shim.Success(LCAsBytes)
}

func (s *SmartContract) getStatus(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	stId := args[0]

	// if err != nil {
	// 	return shim.Error("No Amount")
	// }

	STAsBytes, _ := APIstub.GetState(stId + "ST")

	return shim.Success(STAsBytes)
}

func (s *SmartContract) getOrg(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	orgId := args[0]

	// if err != nil {
	// 	return shim.Error("No Amount")
	// }

	ORAsBytes, _ := APIstub.GetState(orgId)

	fmt.Println("Get organization is successfull   -> ", ORAsBytes)

	return shim.Success(ORAsBytes)
}

func (s *SmartContract) getLCHistory(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	lcId := args[0]

	resultsIterator, err := APIstub.GetHistoryForKey(lcId)
	if err != nil {
		return shim.Error("Error retrieving LC history.")
	}
	defer resultsIterator.Close()

	// buffer is a JSON array containing historic values for the marble
	var buffer bytes.Buffer
	buffer.WriteString("[")

	bArrayMemberAlreadyWritten := false
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error("Error retrieving LC history.")
		}
		// Add a comma before array members, suppress it for the first array member
		if bArrayMemberAlreadyWritten == true {
			buffer.WriteString(",")
		}
		buffer.WriteString("{\"TxId\":")
		buffer.WriteString("\"")
		buffer.WriteString(response.TxId)
		buffer.WriteString("\"")

		buffer.WriteString(", \"Value\":")
		// if it was a delete operation on given key, then we need to set the
		//corresponding value null. Else, we will write the response.Value
		//as-is (as the Value itself a JSON marble)
		if response.IsDelete {
			buffer.WriteString("null")
		} else {
			buffer.WriteString(string(response.Value))
		}

		buffer.WriteString(", \"Timestamp\":")
		buffer.WriteString("\"")
		buffer.WriteString(time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).String())
		buffer.WriteString("\"")

		buffer.WriteString(", \"IsDelete\":")
		buffer.WriteString("\"")
		buffer.WriteString(strconv.FormatBool(response.IsDelete))
		buffer.WriteString("\"")

		buffer.WriteString("}")
		bArrayMemberAlreadyWritten = true
	}
	buffer.WriteString("]")

	fmt.Printf("- getLCHistory returning:\n%s\n", buffer.String())

	return shim.Success(buffer.Bytes())
}

func (s *SmartContract) addOrg(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	bankId := args[0]
	token := args[1]

	//LCAsBytes, _ := APIstub.GetState(lcId)

	//var lc LetterOfCredit

	//err := json.Unmarshal(LCAsBytes, &lc)

	//if err != nil {
	//	return shim.Error("Issue with LC json unmarshaling")
	//}

	OR := Organisation{BankId: bankId, Token: token}
	ORBytes, err := json.Marshal(OR)

	if err != nil {
		return shim.Error("Issue with organization json marshaling")
	}

	APIstub.PutState(bankId, ORBytes)
	fmt.Println("Organization Added -> ", OR)

	return shim.Success(nil)
}

func (s *SmartContract) upload(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	ShipmentID := args[0] + "F"
	FileHash := args[1]

	Filelink := "https://ipfs.io/ipfs/" + FileHash
	//originalname := args[1]
	//destination := args[3]
	//filename := args[4]
	//path := args[5]
	//size := args[6]
	//LCAsBytes, _ := APIstub.GetState(lcId)

	//var lc LetterOfCredit

	//err := json.Unmarshal(LCAsBytes, &lc)

	//if err != nil {
	//	return shim.Error("Issue with LC json unmarshaling")
	//}

	HS := file{ShipmentId: ShipmentID, Hash: Filelink}
	HSBytes, err := json.Marshal(HS)

	if err != nil {
		return shim.Error("Issue with organization json marshaling")
	}

	APIstub.PutState(ShipmentID, HSBytes)
	fmt.Println("File  Added to IPFS file system  -> ", HS)

	return shim.Success(nil)
}

func (s *SmartContract) view(APIstub shim.ChaincodeStubInterface, args []string) sc.Response {

	ShipmentID := args[0] + "F"
	//originalname := args[1]
	//destination := args[3]
	//filename := args[4]
	//path := args[5]
	//size := args[6]
	//LCAsBytes, _ := APIstub.GetState(lcId)

	//var lc LetterOfCredit

	//err := json.Unmarshal(LCAsBytes, &lc)

	//if err != nil {
	//	return shim.Error("Issue with LC json unmarshaling")
	//}

	VWAsBytes, _ := APIstub.GetState(ShipmentID)

	fmt.Println("Hash recieved  -> ", VWAsBytes)

	return shim.Success(VWAsBytes)
}

// The main function is only relevant in unit test mode. Only included here for completeness.
func main() {

	// Create a new Smart Contract
	err := shim.Start(new(SmartContract))
	if err != nil {
		fmt.Printf("Error creating new Smart Contract: %s", err)
	}
}
