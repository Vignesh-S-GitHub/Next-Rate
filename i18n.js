/* Simple Tamil/English localization. No network, no machine translation.
   Only visible text and accessibility labels change, never prices or URLs. */
(function(root){
  'use strict';
  const TA={
    "Home":"முகப்பு","Markets":"சந்தை","Compare":"ஒப்பீடு","Insights":"தகவல்கள்",
    "Chennai":"சென்னை","Mumbai":"மும்பை","Delhi":"டெல்லி",
    "Bengaluru":"பெங்களூரு","Bangalore":"பெங்களூரு","Hyderabad":"ஹைதராபாத்",
    "Choose your city":"நகரத்தைத் தேர்வு செய்க","Choose Indian city":"இந்திய நகரத்தைத் தேர்வு செய்க",
    "Choose city; currently":"தற்போதைய நகரம்",
    "City retail quotes are not yet connected.":"நகர வாரியான விலைகள் கீழே உள்ளன.",
    "Main navigation":"முதன்மை வழிசெலுத்தல்","Mobile navigation":"கீழ் வழிசெலுத்தல்",
    "Switch language":"மொழியை மாற்று","Language":"மொழி",
    "Tomorrow":"நாளை","Today · IBJA":"இன்றைய IBJA விலை",
    "Tomorrow’s Gold & Silver Prediction":"நாளைய தங்கம், வெள்ளி கணிப்பு",
    "India · Next Rate":"இந்தியா · அடுத்த விலை",
    "INDIA · NEXT RATE":"இந்தியா · அடுத்த விலை",
    "Estimate":"கணிப்பு","Estimates":"கணிப்புகள்","Next open day":"அடுத்த சந்தை நாள்",
    "Actual":"உண்மை விலை","Actual Gold & Silver":"தங்கம், வெள்ளி இன்றைய விலை",
    "24K Gold":"24K தங்கம்","22K Gold":"22K தங்கம்",
    "Silver 999":"999 வெள்ளி","Gold · XAU":"தங்கம் · XAU",
    "Silver · XAG":"வெள்ளி · XAG","Silver":"வெள்ளி","Gold":"தங்கம்",
    "24K":"24K","22K":"22K","Pavan":"பவுன்",
    "Range":"விலை வரம்பு","Price":"விலை","Last close":"முந்தைய முடிவு",
    "IBJA":"IBJA","From":"அடிப்படை","Reference only":"தகவலுக்கான விலை",
    "Model":"கணிப்பு முறை","Test model":"சோதனை கணிப்பு",
    "Published rate":"வெளியிடப்பட்ட விலை","No data":"தரவு இல்லை",
    "Accuracy being tested":"துல்லியம் சோதனையில் உள்ளது",
    "No tested improvement":"துல்லிய முன்னேற்றம் உறுதியாகவில்லை",
    "Lower error on test":"சோதனையில் குறைந்த பிழை",
    "Actual result: pending until":"உண்மை விலை வரும் வரை காத்திருக்கவும்:",
    "About this estimate":"கணிப்பு பற்றிய தகவல்",
    "How?":"எப்படி?","IBJA closing prices":"IBJA முடிவு விலைகள்",
    "Range is not a guarantee.":"விலை வரம்பு உறுதி அல்ல.",
    "Shop prices vary.":"கடைகளில் விலை மாறும்.",
    "Today":"இன்று","Yesterday":"நேற்று",
    "By Weight":"எடை வாரியாக","Custom Weight":"விருப்ப எடை",
    "All weights & custom calculator":"அனைத்து எடைகளும் கணக்கீடும்",
    "Enter grams or kg":"கிராம் அல்லது கிலோ உள்ளிடவும்",
    "Weight":"எடை","Unit":"அலகு","grams (g)":"கிராம் (g)","kilograms (kg)":"கிலோ (kg)",
    "Metal value":"உலோகத்தின் மதிப்பு","Metal":"உலோகம்",
    "Estimated bullion value":"மதிப்பிடப்பட்ட விலை",
    "Reference metal value only":"உலோகத்தின் குறிப்பு விலை மட்டும்",
    "Buy Gold":"தங்கம் வாங்க","Buy Gold & Silver":"தங்கம் / வெள்ளி வாங்க",
    "Gold ETF":"தங்க ETF","Silver ETF":"வெள்ளி ETF",
    "Gold Fund":"தங்க ஃபண்ட்","Silver Fund":"வெள்ளி ஃபண்ட்",
    "Gold Bar":"தங்க கட்டி","Gold Coin":"தங்க நாணயம்",
    "Gold Bond (SGB)":"தங்கப் பத்திரம் (SGB)",
    "Digital Gold":"டிஜிட்டல் தங்கம்",
    "Silver Bar":"வெள்ளிக் கட்டி","Silver Coin":"வெள்ளி நாணயம்",
    "Jewellery":"நகை","22K jewellery":"22K நகை",
    "Gold bar":"தங்க கட்டி","Gold coin":"தங்க நாணயம்",
    "Gold ETF · 1 unit":"தங்க ETF · 1 யூனிட்",
    "More: coins, bars, silver, ETFs, SGB":"மேலும்: நாணயங்கள், கட்டிகள், வெள்ளி, ETF, SGB",
    "Reference price":"குறிப்பு விலை","Type / Where":"வகை / இடம்",
    "Extra":"கூடுதல் கட்டணம்","Making extra":"செய்கூலி கூடுதல்",
    "Minting extra":"நாணயச் செலவு கூடுதல்","Premium extra":"விற்பனையாளர் கட்டணம் கூடுதல்",
    "Shop charges extra":"கடைச் செலவுகள் கூடுதல்",
    "Metal + GST":"உலோகம் + GST","NAV / unit":"NAV / யூனிட்",
    "NAV, not trade":"NAV, வர்த்தக விலை அல்ல",
    "Stock broker":"பங்கு தரகர்","Bullion dealer":"தங்க வியாபாரி",
    "Jeweller":"நகைக்கடை","Jeweller / bank":"நகைக்கடை / வங்கி",
    "Fund house / SIP":"ஃபண்ட் நிறுவனம் / SIP",
    "Market quote":"சந்தை விலை","App quote":"செயலியின் விலை",
    "Old bonds only":"பழைய பத்திரங்கள் மட்டும்",
    "Not SEBI regulated":"SEBI ஒழுங்குமுறைக்கு உட்படாதது",
    "City Rates":"நகர வாரி விலைகள்","City rates":"நகர வாரி விலைகள்",
    "Compare Cities":"நகர விலை ஒப்பீடு",
    "City retail rates":"நகரங்களின் குறிப்பு விலை",
    "Select a city":"ஒரு நகரத்தைத் தேர்வு செய்க",
    "India benchmark:":"இந்திய அடிப்படை விலை:",
    "India benchmark":"இந்திய அடிப்படை விலை",
    "City indicative prices":"நகர வாரியான தோராய விலை",
    "Indicative · not a shop quote":"தோராய விலை · கடை விலை அல்ல",
    "No published city rate":"நகர விலை கிடைக்கவில்லை",
    "Rate unavailable":"விலை இல்லை","Source unavailable":"மூலம் கிடைக்கவில்லை",
    "Last available":"கடைசியாக கிடைத்தது",
    "Outdated":"பழைய விலை","Source":"மூலம்",
    "Source date":"மூலத் தேதி","View source":"மூலத்தைக் காண்க",
    "Published":"வெளியிடப்பட்டது",
    "Per 1 gram":"ஒரு கிராமுக்கு","per gram":"ஒரு கிராமுக்கு",
    "per 10 grams":"10 கிராமுக்கு","per kilogram":"ஒரு கிலோவுக்கு",
    "₹ / 10g":"₹ / 10 கிராம்","₹ / kg":"₹ / கிலோ",
    "1 gram":"1 கிராம்","8 grams":"8 கிராம்",
    "GST & making charges extra.":"GST மற்றும் செய்கூலி கூடுதல்.",
    "GST, making charges and shop premiums extra.":"GST, செய்கூலி மற்றும் கடைச் செலவுகள் கூடுதல்.",
    "Published city estimates, not individual jeweller quotations.":"நகரின் குறிப்பு விலை. கடையின் இறுதி விலை அல்ல.",
    "The IBJA national rate is different from city indicative rates.":"IBJA இந்திய விலையும் நகரக் குறிப்பு விலையும் வேறுபடும்.",
    "Major city prices · 1 gram":"முக்கிய நகர விலை · 1 கிராம்",
    "Major city prices · 1 kg":"முக்கிய நகர விலை · 1 கிலோ",
    "Cities":"நகரங்கள்",
    "Markets closed (weekend).":"வார இறுதியில் சந்தை விடுமுறை.",
    "International spot timestamps show when the provider fetched its quote—not proof of Sunday trading. IBJA last publishes on working days.":"சர்வதேச விலையின் நேரம் தகவல் பெறப்பட்ட நேரம். ஞாயிறு வர்த்தகம் நடந்ததற்கான சான்றல்ல.",
    "Spot quotes · FX · India benchmark":"உலக விலை · நாணய மாற்று · இந்திய விலை",
    "Global benchmark prices":"உலகத் தங்க விலை",
    "Indian market":"இந்திய சந்தை",
    "Currency":"நாணய மதிப்பு",
    "Monetary policy":"பணக் கொள்கை",
    "Industrial use":"தொழில்துறை பயன்பாடு",
    "Investors":"முதலீட்டாளர்கள்",
    "Local conversion":"உள்ளூர் விலை மாற்றம்",
    "Gold price drivers":"தங்க விலையை மாற்றும் காரணங்கள்",
    "Silver price drivers":"வெள்ளி விலையை மாற்றும் காரணங்கள்",
    "Data and forecasting policy":"தரவு மற்றும் கணிப்பு முறை",
    "How global and Indian markets influence gold and silver prices.":"உலக மற்றும் இந்திய சந்தைகள் விலையை எவ்வாறு மாற்றுகின்றன?",
    "Source-backed international and Indian reference observations.":"உலக மற்றும் இந்தியக் குறிப்பு விலைகள்.",
    "Actual rates":"உண்மையான விலைகள்",
    "Loading verified market data and tomorrow’s forecast…":"சந்தை விலை மற்றும் நாளைய கணிப்பை ஏற்றுகிறது…",
    "Rates temporarily unavailable":"தற்காலிகமாக விலை கிடைக்கவில்லை",
    "No quote":"விலை இல்லை","Unavailable":"கிடைக்கவில்லை",
    "No earlier observation":"முந்தைய விலை இல்லை",
    "Recent Prices":"சமீபத்திய விலைகள்",
    "Recent prices":"சமீபத்திய விலைகள்",
    "Monday":"திங்கள்","Tuesday":"செவ்வாய்","Wednesday":"புதன்",
    "Thursday":"வியாழன்","Friday":"வெள்ளி",
    "January":"ஜனவரி","February":"பிப்ரவரி","March":"மார்ச்","April":"ஏப்ரல்",
    "May":"மே","June":"ஜூன்","July":"ஜூலை","August":"ஆகஸ்ட்",
    "September":"செப்டம்பர்","October":"அக்டோபர்",
    "November":"நவம்பர்","December":"டிசம்பர்",
    "Jan":"ஜன.","Feb":"பிப்.","Mar":"மார்.","Apr":"ஏப்.",
    "Jun":"ஜூன்","Jul":"ஜூலை","Aug":"ஆக.",
    "Sep":"செப்.","Oct":"அக்.","Nov":"நவ.","Dec":"டிச."
  };
  const keys=Object.keys(TA).sort((a,b)=>b.length-a.length);
  const textOriginals=new WeakMap();
  const attrOriginals=new WeakMap();
  function translate(text,language){
    if(language!=="ta") return text;
    let result=String(text);
    for(const k of keys){
      if(result.includes(k))result=result.replaceAll(k,TA[k]);
    }
    return result;
  }
  function apply(rootElement,language){
    if(!rootElement||!rootElement.ownerDocument)return;
    const doc=rootElement.ownerDocument;
    const walker=doc.createTreeWalker(rootElement,4); // NodeFilter.SHOW_TEXT
    const nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    for(const node of nodes){
      const parent=node.parentElement;
      if(!parent||/^(SCRIPT|STYLE|NOSCRIPT|SVG|OPTION)$/.test(parent.tagName))continue;
      if(!textOriginals.has(node))textOriginals.set(node,node.nodeValue);
      const original=textOriginals.get(node);
      const next=translate(original,language);
      if(node.nodeValue!==next)node.nodeValue=next;
    }
    const elements=[rootElement,...rootElement.querySelectorAll("[aria-label],[title],[placeholder]")];
    for(const elem of elements){
      for(const attr of ["aria-label","title","placeholder"]){
        if(!elem.hasAttribute(attr))continue;
        let saved=attrOriginals.get(elem);
        if(!saved){saved={};attrOriginals.set(elem,saved);}
        if(!(attr in saved))saved[attr]=elem.getAttribute(attr);
        const value=translate(saved[attr],language);
        if(elem.getAttribute(attr)!==value)elem.setAttribute(attr,value);
      }
    }
    doc.documentElement.lang=language==="ta"?"ta-IN":"en-IN";
  }
  function saved(){
    try{return root.localStorage.getItem("nextrate-language")==="ta"?"ta":"en";}
    catch{return "en";}
  }
  function persist(language){
    try{root.localStorage.setItem("nextrate-language",language==="ta"?"ta":"en");}
    catch{/* private mode may deny storage */}
  }
  const api=Object.freeze({translate,apply,saved,persist,TA});
  if(typeof module!=="undefined" && module.exports)module.exports=api;
  root.NextRateI18n=api;
})(typeof window!=="undefined"?window:globalThis);
