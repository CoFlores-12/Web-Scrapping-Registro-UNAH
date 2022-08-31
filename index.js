const express = require('express');
const chrome = require('chrome-aws-lambda');
const puppeteer = require('puppeteer-core');

const app = express();

app.set('port', 8000);

async function getData(cuenta, clave) {
  const browser = await chrome.puppeteer.launch({
    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  })
  const classRes = [];
  const page = await browser.newPage();
  await page.goto('https://registro.unah.edu.hn/pregra_estu_login.aspx');
  await page.type('#MainContent_txt_cuenta', cuenta);
  await page.type('#MainContent_txt_clave', clave);
  await page.click('#MainContent_Button1');

  await page.waitForSelector('#MainContent_LinkButton2');
  await page.click('#MainContent_LinkButton2');

  await page.waitForSelector('#MainContent_ASPxPageControl1_ASPxGridView2_DXMainTable');

  let pages = await page.evaluate(() => {
    const data = document.getElementsByClassName('dxpSummary_Aqua');
    const myArray = data[0].innerHTML.split(" ");
    return myArray[3];
  });

  
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

    await page.evaluate(() => {
      aspxGVPagerOnClick("MainContent_ASPxPageControl1_ASPxGridView2","PBN");
    });

    await page.waitForTimeout(3000);
  }

  const promedio = await page.evaluate(() => {
    const obj = {
      'Average Global': document.getElementById('MainContent_ASPxRoundPanel2_ASPxLabel11').innerHTML,
      'Average Period': document.getElementById('MainContent_ASPxRoundPanel2_ASPxLabel12').innerHTML
    };
    return obj;
  });

  classRes.push(promedio);

  await browser.close();

  return classRes;
}

app.get('/api/:cuenta/:clave', function (req, res) {
  const classRes = [];
  
  (async () => {
    const response = await getData(req.params['cuenta'], req.params['clave']);
    res.send(response);
  })();

  
});

app.listen(app.get('port'), function(err){
   if (err) console.log(err);
   console.log("Server listening on PORT", app.get('port'));
});
