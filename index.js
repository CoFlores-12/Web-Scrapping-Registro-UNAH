const express = require('express');
const chrome = require('chrome-aws-lambda');

const app = express();

app.set('port', 8000);

let browser = null;
let page = null;
let pages = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function openRegister(req,res,next){
  if (browser === null) {
      browser = await chrome.puppeteer.launch({
          args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
          defaultViewport: chrome.defaultViewport,
          executablePath: await chrome.executablePath,
          headless: true,
          ignoreHTTPSErrors: true,
      });
  }
  //go to login page
  page = await browser.newPage();
  await page.goto('https://registro.unah.edu.hn/pregra_estu_login.aspx');
  await next();
}

async function login(req,res,next){
  //login with credentials 
  await page.type('#MainContent_txt_cuenta', req.params['cuenta']);
  await page.type('#MainContent_txt_clave', req.params['clave']);
  await page.click('#MainContent_Button1');

  //go to history
  await page.waitForSelector('#MainContent_LinkButton2');
  await next();
}

async function pageNumber(req,res,next){
  
  await page.click('#MainContent_LinkButton2');

  await page.waitForSelector('#MainContent_ASPxPageControl1_ASPxGridView2_DXMainTable');

  //get number of pages in history
  pages = await page.evaluate(() => {
    const data = document.getElementsByClassName('dxpSummary_Aqua');
    const myArray = data[0].innerHTML.split(" ");
    return myArray[3];
  });
  
  await next();
}

app.get('/api/:cuenta/:clave', openRegister, login, pageNumber, async function (req, res) {
  
  //JSON response
  const classRes = [];

  for (let i = 0; i < pages; i++) {
    const classRestmp = await page.evaluate(() => { 
      const  clases = [];
      //get all elements of class table
      const elements = document.querySelectorAll('#MainContent_ASPxPageControl1_ASPxGridView2_DXMainTable tbody tr');

      for (let index = 9; index<elements.length; index++){
          const obj = {
              'classname': elements[index].getElementsByTagName('td')[1].innerHTML,
              'nota': elements[index].getElementsByTagName('td')[6].innerHTML
          };
          clases.push(obj);
      }
      return clases;
    });

    for (const cl of classRestmp) {
      classRes.push(cl);
    }

    //next page in history
    await page.evaluate(() => {
      aspxGVPagerOnClick("MainContent_ASPxPageControl1_ASPxGridView2","PBN");
    });

    await page.waitForTimeout(900);
  }

  //get averanges
  const promedio = await page.evaluate(() => {
    const obj = {
      'Average Global': document.getElementById('MainContent_ASPxRoundPanel2_ASPxLabel11').innerHTML,
      'Average Period': document.getElementById('MainContent_ASPxRoundPanel2_ASPxLabel12').innerHTML
    };
    return obj;
  });
  classRes.push(promedio);

  await page.close();
  page = null;
  
  res.send(classRes);
  
});

app.listen(app.get('port'), async function(err){
   if (err) console.log(err);
   browser = await chrome.puppeteer.launch({
    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
});
   console.log("Server listening on PORT", app.get('port'));
});
