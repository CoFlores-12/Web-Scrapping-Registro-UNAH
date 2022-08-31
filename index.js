const express = require('express');
const chrome = require('chrome-aws-lambda');

const app = express();

app.set('port', 8000);

const browser = {};

(async () => {
  browser = await chrome.puppeteer.launch({
    args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
    defaultViewport: chrome.defaultViewport,
    executablePath: await chrome.executablePath,
    headless: true,
    ignoreHTTPSErrors: true,
  })
});


app.get('/api/:cuenta/:clave', async function (req, res) {
  //JSON response
  const classRes = [];
  
  //go to login page
  const page = await browser.newPage();
  await page.goto('https://registro.unah.edu.hn/pregra_estu_login.aspx');

  //login with credentials 
  await page.type('#MainContent_txt_cuenta', req.params['cuenta']);
  await page.type('#MainContent_txt_clave', req.params['clave']);
  await page.click('#MainContent_Button1');
  
  //go to history
  await page.waitForSelector('#MainContent_LinkButton2');
  await page.click('#MainContent_LinkButton2');

  await page.waitForSelector('#MainContent_ASPxPageControl1_ASPxGridView2_DXMainTable');

  //get number of pages in history
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

    //next page in history
    await page.evaluate(() => {
      aspxGVPagerOnClick("MainContent_ASPxPageControl1_ASPxGridView2","PBN");
    });

    await page.waitForTimeout(1500);
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

  await browser.close();

  res.send(classRes);
  
});

app.listen(app.get('port'), function(err){
   if (err) console.log(err);
   console.log("Server listening on PORT", app.get('port'));
});
