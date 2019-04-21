var express = require('express');
var router = express.Router();
var bodyParser = require('body-parser');
var multer = require("multer");
var upload = multer({ dest: "uploads/" })

const ipfsAPI = require('ipfs-api');
const fs = require('fs');
const ipfs = ipfsAPI('ipfs.infura.io', '5001', {protocol: 'https'})
//var upload = multer();
//var type = upload.single('recfile');

var storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, './uploads');
  },
  filename: function (req, file, callback) {
    console.log(file);
    callback(null, Date.now()+'-'+file.originalname)
  }
});
/*var upload = multer({storage: storage}).single('nfbc.go');
//var storage = multer.diskStorage({
//    destination: (req, file, cb) => {
 //     cb(null, 'public/images/uploads')
 //   },
 //   filename: (req, file, cb) => {
 //     cb(null, file.fieldname + '-' + Date.now())
 //   }
//});*/
var upload = multer({storage: storage});

//console.log(req);

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

var TFBC = require("./FabricHelper")


// Request LC
router.post('/requestLC', function (req, res) {

TFBC.requestLC(req, res);

});

// Issue LC
router.post('/issueLC', function (req, res) {

    TFBC.issueLC(req, res);
    
});

// Accept LC
router.post('/acceptLC', function (req, res) {

    TFBC.acceptLC(req, res);
    
});

// Get LC
router.post('/getLC', function (req, res) {

    TFBC.getLC(req, res);
    
});

// Get LC history
router.post('/getLCHistory', function (req, res) {

    TFBC.getLCHistory(req, res);
    
});

// exporter
//router.post('/exporter', function (req, res) {

//    TFBC.exporter(req, res);
    
//});

router.post('/exporter',function (req, res) {
  //  const file = req.file
   // if (!file) {
   //   const error = new Error('Please upload a file')
    //  error.httpStatusCode = 400
    //  return next(error)
   // }
     TFBC.exporter(req,res);
    
  });

  router.post('/getSH',function (req, res) {
    //  const file = req.file
     // if (!file) {
     //   const error = new Error('Please upload a file')
      //  error.httpStatusCode = 400
      //  return next(error)
     // }
       TFBC.getSH(req,res);
      
    });
    
    router.post('/customesApprove',function (req, res) {
      //  const file = req.file
       // if (!file) {
       //   const error = new Error('Please upload a file')
        //  error.httpStatusCode = 400
        //  return next(error)
       // }
         TFBC.customesApprove(req,res);
        
    });

    router.post('/customesReject',function (req, res) {
        //  const file = req.file
         // if (!file) {
         //   const error = new Error('Please upload a file')
          //  error.httpStatusCode = 400
          //  return next(error)
         // }
           TFBC.customesReject(req,res);
          
    });

    router.post('/importer',function (req, res) {
      //  const file = req.file
       // if (!file) {
       //   const error = new Error('Please upload a file')
        //  error.httpStatusCode = 400
        //  return next(error)
       // }
         TFBC.importer(req,res);
        
    });

    router.post('/getStatus',function (req, res) {
      //  const file = req.file
       // if (!file) {
       //   const error = new Error('Please upload a file')
        //  error.httpStatusCode = 400
        //  return next(error)
       // }
         TFBC.getStatus(req,res);
        
    });

    router.post('/addOrg',function (req, res) {
      //  const file = req.file
       // if (!file) {
       //   const error = new Error('Please upload a file')
        //  error.httpStatusCode = 400
        //  return next(error)
       // }
         TFBC.addOrg(req,res);
        
    });

    router.post('/getOrg',function (req, res) {
      //  const file = req.file
       // if (!file) {
       //   const error = new Error('Please upload a file')
        //  error.httpStatusCode = 400
        //  return next(error)
       // }
         TFBC.getOrg(req,res);
        
    });

    router.post('/upload',upload.single('ufile'),function (req,res,next) {

     /* upload(req,res,function(err){
        //console.log(req) 
        if(err) {
          return res.end("Error uploading file.");
        }
        else
        {
          res.end("File is uploaded");
        }
      });*/

  //let testFile = fs.readFileSync(req.file.path);
	//Creating buffer for ipfs function to add file to the system
	//let testBuffer = new Buffer(testFile);
	//upload(req, res, function(err) {
	//if(err) {
	//    console.log('Error Occured');
	//  return;
	//  }
	//});
	//console.log (testFile);
	//ipfs.files.add(testBuffer, function (err, file) {
	//if (err) {
	//		console.log(err);
	//}
  //    console.log("primg file value",file);
  //    var file1 = JSON.stringify(file);
  //    console.log("primg file value",file[0].hash);

  //    req.body.HashValue = file[0].hash

      //console

  //    console.log(req.body.HashValue)
      
      
   // })

  //var file1 = JSON.stringify(file);

  //console.log(file1)
  
  
      
     // console.log(req);
      //console.log(req.file);
      //console.log(req.body);
      //console.log(router.use(upload.array));
      
    
    TFBC.upload(req,res);
        
    });

    router.post('/view',function (req, res) {
      //  const file = req.file
       // if (!file) {
       //   const error = new Error('Please upload a file')
        //  error.httpStatusCode = 400
        //  return next(error)
       // }
         TFBC.view(req,res);
        
    });


module.exports = router;
