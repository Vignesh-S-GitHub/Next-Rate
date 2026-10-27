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
    "Sep":"செப்.","Oct":"அக்.","Nov":"நவ.","Dec":"டிச.",
    "City rates · published references":"நகர வாரியான வெளியிடப்பட்ட விலைகள்",
    "Publisher city prices in Compare.":"நகர விலைகளை ஒப்பீடு பகுதியில் பார்க்கலாம்.",
    "Select metal for weight prices":"எடைக்கான உலோகத்தைத் தேர்ந்தெடுக்கவும்",
    "Common bullion weights":"பொதுவான உலோக எடைகள்",
    "Choose metal":"உலோகத்தைத் தேர்ந்தெடு",
    "Choose gold or silver":"தங்கம் அல்லது வெள்ளியைத் தேர்ந்தெடு",
    "City / Where":"நகரம் / இடம்",
    "Market price":"சந்தை விலை",
    "Shop price":"கடை விலை",
    "International metal quotes":"உலக உலோக விலை",
    "Currency movement":"நாணய மதிப்பின் மாற்றம்",
    "Domestic physical-market demand":"இந்திய உள்நாட்டு தேவை",
    "Daily reference · INR / USD":"தினசரி மதிப்பு · INR / USD",
    "Indicative spot · USD / troy oz":"குறிப்பு விலை · USD / டிராய் அவுன்ஸ்",
    "IBJA national benchmark · ₹ / 10g":"இந்திய IBJA அடிப்படை விலை · ₹ / 10 கிராம்",
    "India 24K":"இந்தியா 24K",
    "Fetched":"தரவு பெறப்பட்டது",
    "Reference":"குறிப்பு",
    "Reference quote":"குறிப்பு விலை",
    "Other market venues":"பிற சந்தைகள்",
    "What affects tomorrow?":"நாளைய விலையை மாற்றுவது எது?",
    "Global spot prices reflect precious-metal demand and market expectations.":"உலக சந்தையின் தேவை மற்றும் எதிர்பார்ப்புகள் உலோக விலையை மாற்றலாம்.",
    "The USD/INR rate changes the rupee value of globally priced metals.":"டாலருக்கு எதிரான ரூபாய் மதிப்பு இந்திய உலோக விலையை மாற்றும்.",
    "Local premiums, import policies, taxes and jewellery demand affect final retail prices.":"இறக்குமதி வரி, உள்ளூர் கட்டணம், நகைத் தேவை ஆகியவை கடை விலையை மாற்றும்.",
    "LBMA auction benchmarks, COMEX futures and MCX futures require separate authorised feeds. They are not equivalent to international spot quotes or the IBJA physical-market benchmark.":"LBMA, COMEX, MCX விலைகளுக்குத் தனியான அங்கீகரிக்கப்பட்ட தரவு தேவை. அவை உலக ஸ்பாட் விலையோ IBJA விலையோ அல்ல.",
    "London benchmarks and US futures can influence global bullion trends; their official quotations are not yet integrated.":"லண்டன் மற்றும் அமெரிக்க எதிர்கால வர்த்தகங்கள் தங்க விலையை மாற்றலாம். அவற்றின் நேரடி தரவு இன்னும் இணைக்கப்படவில்லை.",
    "IBJA publishes India’s physical-market reference for multiple gold purities.":"IBJA இந்தியாவில் பல்வேறு தூய்மைகளுக்கான தங்கத்தின் அடிப்படை விலையை வெளியிடுகிறது.",
    "A weaker rupee can lift INR-denominated prices even if USD gold prices are flat.":"ரூபாய் மதிப்பு குறைந்தால், உலக தங்க விலை மாறாதபோதும் இந்திய விலை உயரலாம்.",
    "US real yields, inflation expectations, policy rates and risk sentiment can change demand.":"அமெரிக்க வட்டி, பணவீக்கம் மற்றும் முதலீட்டாளர் மனநிலை தங்கத் தேவையை மாற்றலாம்.",
    "Solar panels, electronics and industrial output contribute to silver demand.":"சூரிய மின்தகடுகள், மின்னணுப் பொருட்கள், தொழில்துறை உற்பத்தி ஆகியவை வெள்ளிக்கான தேவையை உயர்த்துகின்றன.",
    "Fund holdings, futures positioning and risk sentiment can influence prices.":"முதலீட்டு ஃபண்டுகள் மற்றும் எதிர்கால வர்த்தகம் வெள்ளி விலையை மாற்றலாம்.",
    "USD/INR, physical-market premiums and taxes can change Indian prices.":"டாலர் / ரூபாய் விகிதம், வரிகள் மற்றும் உள்ளூர் கட்டணம் இந்திய விலையை மாற்றலாம்.",
    "The live data collection runs automatically on Cloudflare, normally twice daily. The data labels show the publisher’s observation date, not the most recent page visit. On market holidays and weekends the last published IBJA rate is retained with its original date. No city premiums, model confidence, futures settlements or tomorrow’s predicted prices are fabricated.":"சந்தைத் தரவு பொதுவாக தினமும் இருமுறை தானாகப் புதுப்பிக்கப்படுகிறது. காட்டப்படும் தேதி, மூலத்தில் விலை வெளியான தேதி. விடுமுறை நாளில் கடைசியாக வெளியிடப்பட்ட IBJA விலையே காட்டப்படும். இல்லாத நகர விலையோ கணிப்போ உருவாக்கப்படாது.",
    "IBJA benchmark rates exclude GST and making charges. International spot and FX quotes are separate markets and do not directly represent Indian jewellery prices.":"IBJA விலையில் GST மற்றும் செய்கூலி சேராது. உலக உலோக விலையும் நாணய விகிதமும் இந்திய நகைக் கடையின் இறுதி விலை அல்ல.",
    "National IBJA benchmark for":"இந்திய IBJA அடிப்படை விலை:",
    "). Prices exclude GST and making charges. These are not jewellery-shop or city-specific selling prices.":"). GST மற்றும் செய்கூலி இதில் சேராது. இது நகரம் அல்லது கடைக்கான இறுதி விலை அல்ல.",
    "IBJA reference rates are currently unavailable. No placeholder or estimated retail prices are shown.":"IBJA விலை தற்போது கிடைக்கவில்லை. கற்பனை விலை காட்டப்படாது.",
    "This observation is older than four days: check the publisher for newer rates.":"இந்த விலை நான்கு நாட்களுக்கும் பழையது. சமீபத்திய விலையை மூலத்தில் சரிபார்க்கவும்.",
    "Source: IBJA":"மூலம்: IBJA",
    "Actual national rate":"இந்திய அடிப்படை விலை",
    "All weights & custom calculator":"அனைத்து எடைகள் மற்றும் கணக்கீடு",
    "1 sovereign / pavan":"1 பவுன்",
    "Calculate":"கணக்கிடு",
    "grams of":"கிராம்",
    "Grams":"கிராம்",
    "Kilograms":"கிலோகிராம்",
    "e.g. 8":"உதா. 8",
    "Based on national IBJA":"இந்திய IBJA விலையின் அடிப்படையில்",
    "Waiting for a verified rate":"உறுதிப்படுத்தப்பட்ட விலைக்காக காத்திருக்கிறது",
    "Enter a valid weight to see its value":"சரியான எடையை உள்ளிடவும்",
    "Reference metal value only · Excludes GST, making charges and local dealer premiums. Calculated from the IBJA":"உலோகத்தின் அடிப்படை விலை மட்டும் · GST, செய்கூலி மற்றும் உள்ளூர் கட்டணங்கள் சேராது. IBJA",
    "rate, not a retail shop quotation.":"விலையிலிருந்து கணக்கிடப்பட்டது; கடையின் இறுதி விலை அல்ல.",
    "benchmarks":"அடிப்படை விலைகள்",
    "benchmark:":"அடிப்படை விலை:",
    "City indicative quotes differ.":"நகர வாரியான விலைகள் மாறுபடும்.",
    "One India-wide reference.":"இந்தியா முழுவதற்குமான ஒரே அடிப்படை விலை.",
    "Shop quotes are not connected.":"கடை விலைகள் இணைக்கப்படவில்லை.",
    "Not a live quotation":"நேரடி விலை அல்ல",
    "Source backed":"மூலத்துடன் உறுதிப்படுத்தப்பட்டது",
    "Shop charges extra.":"கடைச் செலவுகள் கூடுதல்.",
    "Market closed":"சந்தை மூடப்பட்டுள்ளது",
    "IBJA last publishes on working days.":"IBJA வேலை நாட்களில் மட்டுமே விலையை வெளியிடுகிறது.",
    "City indicative prices":"நகரங்களின் தோராய விலைகள்",
    "8g":"8 கிராம்",
    "1g":"1 கிராம்",
    "10g":"10 கிராம்",
    "1kg":"1 கிலோ"

  };
  Object.assign(TA,{
    "Tools":"கருவிகள்","Price Alerts":"விலை அறிவிப்புகள்",
    "Jewellery Bill":"நகை பில்","Accuracy":"கணிப்பு துல்லியம்",
    "My Gold":"எனது தங்கம்","All 9 features":"9 அம்சங்கள்",
    "Open tools":"கருவிகளைத் திறக்க"
  });
  Object.assign(TA,{"Tools":"கருவிகள்","Gold Tools":"தங்கக் கருவிகள்","9 tools · Simple and private":"9 கருவிகள் · எளிமையானது மற்றும் தனிப்பட்டது","Price Alerts":"விலை எச்சரிக்கைகள்","Price alert":"விலை எச்சரிக்கை","Jewellery Bill":"நகை பில் கணக்கீடு","Jewellery bill":"நகை பில்","Prediction Accuracy":"கணிப்பின் துல்லியம்","Actual vs estimate":"உண்மை விலை / கணிப்பு","Shop Comparison":"நகைக்கடை ஒப்பீடு","Your quotes":"நீங்கள் பெற்ற விலைகள்","My Portfolio":"என் முதலீடுகள்","My gold":"என் தங்கம்","Sell / Exchange":"விற்பனை / மாற்றம்","Resale value":"மறுவிற்பனை விலை","Verify Hallmark":"ஹால்மார்க் சரிபார்ப்பு","BIS Care":"BIS கேர்","ETF Comparison":"ETF ஒப்பீடு","NAV & premiums":"NAV மற்றும் கூடுதல் விலை","Global Signals":"உலகச் சந்தை","World markets":"உலக சந்தைகள்","Target watch":"இலக்கு விலை கண்காணிப்பு","Total cost":"மொத்த செலவு","Holdings":"சொத்துகள்","Check saved targets here when you open NextRate.":"NextRate திறக்கும்போது சேமித்த இலக்கு விலைகளைப் பார்க்கலாம்.","Saved alerts":"சேமித்த எச்சரிக்கைகள்","Reached targets":"இலக்கை அடைந்தவை","Weight (g)":"எடை (கிராம்)","Total target (₹)":"இலக்கு மொத்த விலை (₹)","Alert when":"எச்சரிக்கை நிபந்தனை","Falls to / below":"குறையும்போது","Rises to / above":"உயரும்போது","Save price alert":"எச்சரிக்கையைச் சேமி","No alerts yet.":"இன்னும் எச்சரிக்கைகள் இல்லை.","Metal + wastage + making + GST.":"தங்கம் + சேதாரம் + செய்கூலி + GST.","Gold purity":"தங்கத் தூய்மை","Net gold weight (g)":"நிகர தங்க எடை (கிராம்)","Wastage (%)":"சேதாரம் (%)","Making charge (%)":"செய்கூலி (%)","Fixed making (₹)":"நிலையான செய்கூலி (₹)","Calculate bill":"பில் கணக்கிடு","Estimated total":"மதிப்பிடப்பட்ட மொத்தம்","Making":"செய்கூலி","Wastage":"சேதாரம்","Past forecast versus actual close.":"முந்தைய கணிப்பும் உண்மை விலையும்.","Issued forecast error":"வெளியிட்ட கணிப்பின் பிழை","Older walk-forward test":"முந்தைய கணிப்பு சோதனை","Awaiting actual closes":"உண்மை விலை வரவில்லை","No published forecasts yet.":"கணிப்புகள் இல்லை","Issued forecasts":"வெளியிடப்பட்ட கணிப்புகள்","Predicted":"கணிப்பு","Actual pending":"உண்மை விலை வரவில்லை","Compare your own shop quotes.":"நீங்கள் பெற்ற நகைக்கடை விலைகளை ஒப்பிடுங்கள்.","City 22K reference:":"நகரின் 22K குறிப்பு விலை:","City source":"நகர விலை மூலம்","Jeweller / shop":"நகைக்கடை","Shop rate / g (₹)":"கடை விலை / கிராம் (₹)","Making (%)":"செய்கூலி (%)","Flat making (₹)":"நிலையான செய்கூலி (₹)","Save and compare":"சேமித்து ஒப்பிடு","Lowest entered":"உள்ளிட்டவற்றில் குறைந்த விலை","User-entered":"நீங்கள் உள்ளிட்டது","No current NAV":"தற்போதைய NAV இல்லை","No holdings saved.":"சொத்துகள் சேமிக்கப்படவில்லை.","Private to this browser.":"இந்த உலாவியில் மட்டும் தனிப்பட்டது.","Reference value":"குறிப்பு மதிப்பு","Indicative gain / loss":"லாபம் / நஷ்டம் (தோராயம்)","Item name":"பெயர்","Holding":"வகை","Grams / ETF units":"கிராம் / ETF யூனிட்","Total paid (₹)":"செலுத்திய தொகை (₹)","Add holding":"சொத்தைச் சேர்","Download my backup":"என் தரவைப் பதிவிறக்கு","Restore backup":"தரவை மீட்டெடு","Estimate resale proceeds.":"மறுவிற்பனைத் தொகையைக் கணக்கிடுங்கள்.","Net gold (g)":"நிகர தங்க எடை (கிராம்)","Purity":"தூய்மை","Buyer deduction (%)":"வாங்குபவரின் பிடித்தம் (%)","Testing / other fee (₹)":"சோதனை / பிற கட்டணம் (₹)","Estimate resale":"மறுவிற்பனைத் தொகை கணக்கிடு","Estimated cash / exchange value":"மதிப்பிடப்பட்ட பணம் / மாற்று மதிப்பு","Official BIS Care app.":"அதிகாரப்பூர்வ BIS Care செயலி.","Check gold jewellery HUID":"தங்க நகை HUID சரிபார்ப்பு","6-character HUID":"6 எழுத்து HUID","Copy HUID to check in BIS Care":"BIS Care-இல் சரிபார்க்க HUID நகலெடு","Open official BIS Care":"அதிகாரப்பூர்வ BIS Care-ஐத் திறக்கவும்","Not yet verified":"இன்னும் சரிபார்க்கப்படவில்லை","Published AMFI NAV. Trade price may differ.":"வெளியிட்ட AMFI NAV. வர்த்தக விலை மாறலாம்.","NAV / unit":"NAV / யூனிட்","Manual premium":"நீங்கள் உள்ளிட்ட கூடுதல் விலை","Exchange price entered by you (₹)":"நீங்கள் உள்ளிட்ட சந்தை விலை (₹)","Compare to NAV":"NAV உடன் ஒப்பிடு","Official feed not connected":"அங்கீகரிக்கப்பட்ட தரவு இணைக்கப்படவில்லை","Current dated market references.":"தேதியிட்ட உலக சந்தை விலைகள்.","Daily FX reference":"தினசரி நாணய மாற்று குறிப்பு","Saved successfully":"சேமிக்கப்பட்டது","Manual shop quote saved.":"கடை விலை சேமிக்கப்பட்டது.","Item removed.":"பொருள் நீக்கப்பட்டது.","Pending":"நிலுவையில்","Source unavailable":"மூலம் கிடைக்கவில்லை","NextRate cannot verify HUID by itself.":"NextRate மட்டும் HUID-ஐச் சரிபார்க்க முடியாது.","Quick tools":"விரைவுக் கருவிகள்","3% GST":"3% GST","Jewellery":"நகை","Gold BeES ETF":"தங்க BeES ETF"});
  Object.assign(TA,{"Price Trend":"விலை மாற்றம்","Published prices":"வெளியிடப்பட்ட விலைகள்","Actual prices":"உண்மையான விலைகள்","Prediction · not actual":"கணிப்பு · உண்மை விலை அல்ல","Same as last close":"முந்தைய முடிவு விலையே","Possible range · not guaranteed":"சாத்தியமான வரம்பு · உறுதியல்ல","How to read this prediction":"இந்தக் கணிப்பை எப்படிப் புரிந்துகொள்வது?","The large number is a forecast, not a confirmed future price. The range is only a possible scenario, not guaranteed limits.":"காட்டப்படும் பெரிய எண் நாளைய கணிப்பு மட்டுமே. வரம்பு சாத்தியமான விலை; உறுதி இல்லை.","Past simulation error":"முந்தைய மாதிரி சோதனைப் பிழை","historical closes":"வரலாற்று முடிவு விலைகள்","No proven improvement over last close":"முந்தைய விலையைவிட மேம்பாடு உறுதியாகவில்லை","Tap any point to see its date and price. Slide below to explore more dates.":"தேதி மற்றும் விலையை அறிய வரைபடப் புள்ளியைத் தட்டவும். கீழே உள்ள பட்டியை நகர்த்தலாம்.","Explore dates":"தேதிகளைப் பார்க்க","Previous date":"முந்தைய தேதி","Next date":"அடுத்த தேதி","Choose an actual date or forecast":"உண்மை விலைத் தேதி அல்லது கணிப்பைத் தேர்ந்தெடு","ACTUAL":"உண்மை விலை","PREDICTION":"கணிப்பு","Experimental price estimate, not a known future price.":"சோதனை கணிப்பு; உறுதியான எதிர்கால விலை அல்ல.","Same as the last published rate.":"கடைசியாக வெளியான விலையே மீண்டும் கணிக்கப்பட்டுள்ளது.","A past actual observation, not a prediction.":"இது முந்தைய உண்மையான விலை; கணிப்பு அல்ல.","Recorded IBJA":"பதிவான IBJA","reference price.":"குறிப்பு விலை.","Not a guarantee.":"உறுதி இல்லை.","Solid gold line = recorded prices. Dashed line and shaded area =":"தொடர் தங்கக் கோடு = உண்மை விலை. புள்ளிக் கோடும் நிழல் பகுதியும் =","experimental prediction":"சோதனை கணிப்பு","not a confirmed rate.":"உறுதியான விலை அல்ல.","Estimate":"கணிப்பு","Range":"வரம்பு"});
  Object.assign(TA,{"Move slider":"பட்டியை நகர்த்தவும்","Estimate only · Not guaranteed":"கணிப்பு மட்டுமே · உறுதி இல்லை","Learn what moves metal prices":"உலோக விலை ஏன் மாறுகிறது?","How India prices move":"இந்திய விலை எப்படி மாறுகிறது","World price":"உலக விலை","India + costs":"இந்திய விலை + செலவுகள்","Global markets, FX and local premiums shape Indian prices. GST and making charges are extra.":"உலக விலை, நாணய மாற்றம், உள்ளூர் செலவுகள் இந்திய விலையை மாற்றும். GST, செய்கூலி கூடுதல்.","Gold drivers":"தங்க விலைக் காரணிகள்","Silver drivers":"வெள்ளி விலைக் காரணிகள்","What may change gold prices":"தங்க விலையை மாற்றுபவை","What may change silver prices":"வெள்ளி விலையை மாற்றுபவை","World gold":"உலகத் தங்க விலை","Global ↑ → India often ↑":"உலக விலை ↑ → இந்திய விலை பல நேரங்களில் ↑","Rupee":"ரூபாய்","INR weakens → local gold may rise":"ரூபாய் பலவீனம் → தங்க விலை உயரலாம்","Real yields":"உண்மை வட்டி வருமானம்","Higher real yields often pressure gold":"உண்மை வட்டி உயர்ந்தால் தங்க விலை குறையலாம்","Safe-haven demand":"பாதுகாப்பு முதலீடு","Uncertainty may lift gold":"நிச்சயமற்ற சூழல் தங்கத்தை உயர்த்தலாம்","Central banks":"மத்திய வங்கிகள்","More buying can support gold":"வாங்குதல் அதிகமானால் தங்கம் வலுப்பெறலாம்","Jewellery demand":"நகைத் தேவை","Festivals may lift shop premiums":"பண்டிகையில் கடை கூடுதல் கட்டணம் உயரலாம்","Solar power":"சூரிய மின்சாரம்","Solar panels use silver":"சோலார் உற்பத்திக்கு வெள்ளி தேவை","Electronics":"மின்னணுப் பொருட்கள்","Devices add to silver demand":"சாதன உற்பத்தி வெள்ளித் தேவையை உயர்த்தும்","Industry":"தொழில்","Growth may increase silver use":"தொழில் வளர்ச்சி வெள்ளித் தேவையை உயர்த்தலாம்","Mine supply":"சுரங்க உற்பத்தி","More supply may pressure prices":"உற்பத்தி உயர்ந்தால் விலை குறையலாம்","Weak INR may lift local silver":"ரூபாய் பலவீனம் வெள்ளி விலையை உயர்த்தலாம்","Investors":"முதலீட்டாளர்கள்","Fund flows can move silver":"முதலீட்டு நிதி வரவு வெள்ளி விலையை மாற்றலாம்","May lift":"உயரலாம்","May lower":"குறையலாம்","Varies":"மாறுபடும்","↗ May lift · ↘ May lower · ↔ Depends on conditions":"↗ உயரலாம் · ↘ குறையலாம் · ↔ சூழல் பொறுத்தது","Common relationships, not the proven cause of today’s move.":"இவை பொதுவான விளைவுகள்; இன்றைய விலை மாற்றத்திற்கான உறுதியான காரணங்கள் அல்ல.","Data and forecasting policy":"தரவு மற்றும் கணிப்புக் கொள்கை","Global market quotes, currency and local charges influence prices":"உலக விலை, நாணயம், உள்ளூர் செலவுகள் விலையை மாற்றுகின்றன","Actual →":"உண்மை விலை →","Data updates automatically. Source dates are shown; holidays retain the last IBJA close. Forecasts are experimental, not guaranteed.":"தரவு தானாக புதுப்பிக்கப்படும். விடுமுறையில் கடைசியாக வெளியான IBJA விலையே இருக்கும். கணிப்பு உறுதி அல்ல.","IBJA rates exclude GST and making charges. Global spot and FX are not Indian shop rates.":"IBJA விலையில் GST, செய்கூலி இல்லை. உலக சந்தை விலை இந்தியக் கடை விலை அல்ல."});
  Object.assign(TA,{
    "Latest published · IBJA":"கடைசியாக வெளியான IBJA விலை",
    "Latest price changes":"சமீபத்திய விலை மாற்றம்",
    "Up":"உயர்வு","Down":"குறைவு","Unchanged":"மாற்றமில்லை",
    "vs ":"ஒப்பீடு ","publication":"வெளியீடு",
    "Typical range · 50%":"வழக்கமான வரம்பு · 50%",
    "Same as latest rate":"கடைசி விலைக்கு சமம்",
    "AM preview · Updates after PM close":"காலை முன்னோட்டம் · மாலை முடிவில் புதுப்பிக்கப்படும்",
    "50% historical typical-move band. Wider moves are possible.":"முந்தைய வழக்கமான நகர்வுகளில் 50% வரம்பு. இதைவிட அதிக மாற்றமும் ஏற்படலாம்.",
    "Typical band in later historical tests:":"பிந்தைய வரலாற்றுச் சோதனையில் வரம்புக்குள்:",
    "Wider scenario:":"விரிவான வரம்பு:",
    "Forecast check":"கணிப்பு சரிபார்ப்பு",
    "No earlier issued forecast to check yet.":"சரிபார்க்க முந்தைய கணிப்பு இல்லை.",
    "Issued forecast versus actual":"வெளியிட்ட கணிப்பும் உண்மை விலையும்",
    "AM comparison only · Final result after PM close":"காலை ஒப்பீடு மட்டும் · மாலை முடிவில் இறுதி முடிவு",
    "Final · Compared with the published PM close":"இறுதி · வெளியான மாலை விலையுடன் ஒப்பீடு",
    "Pending · Waiting for the published PM close":"மாலை இறுதி விலைக்காக காத்திருக்கிறது",
    "Awaiting PM close":"மாலை முடிவுக்காக காத்திருக்கிறது",
    "Exact price":"துல்லியமான விலை","Within forecast range":"கணிப்பு வரம்புக்குள்",
    "Outside forecast range":"கணிப்பு வரம்பிற்கு வெளியே",
    "Predicted":"கணிக்கப்பட்டது","Actual · AM":"உண்மை · காலை","Actual · PM":"உண்மை · மாலை",
    "Error ":"வேறுபாடு ","No up/down call":"உயர்வு / குறைவு கணிக்கப்படவில்லை",
    "Direction matched":"திசை பொருந்தியது","Direction missed":"திசை பொருந்தவில்லை"
  });
  Object.assign(TA,{
    "Two gold bars":"இரண்டு தங்கக் கட்டிகள்","Two silver bars":"இரண்டு வெள்ளிக் கட்டிகள்",
    "GOLD & SILVER":"தங்கம் மற்றும் வெள்ளி","Know your metals":"உலோகங்களை அறியுங்கள்","Explore guide →":"வழிகாட்டியைப் பார்க்க →",
    "Purity, weights & jewellery":"தூய்மை, எடை மற்றும் நகை","Fineness, bars & everyday buying":"தூய்மை, கட்டிகள் மற்றும் வாங்கும் வழிகள்",
    "PURITY MADE SIMPLE":"தூய்மையை எளிதாக அறியுங்கள்","Know your metal":"உலோகத்தை அறியுங்கள்",
    "Same weight. Different purity. Different metal value.":"ஒரே எடை. வெவ்வேறு தூய்மை. வெவ்வேறு உலோக மதிப்பு.",
    "Read the gold content in a fineness mark.":"தூய்மைக் குறியில் தங்கத்தின் அளவை அறியுங்கள்.",
    "Read the silver content in a fineness mark.":"தூய்மைக் குறியில் வெள்ளியின் அளவை அறியுங்கள்.",
    "metal content":"உலோக அளவு","Examples of fineness marks. Verify the full hallmark.":"இவை தூய்மைக் குறிகளின் எடுத்துக்காட்டுகள். முழு ஹால்மார்க்கையும் சரிபார்க்கவும்.",
    "Gold hallmarking ↗":"தங்க ஹால்மார்க் ↗","Silver hallmarking ↗":"வெள்ளி ஹால்மார்க் ↗",
    "AT THE COUNTER":"வாங்கும் இடத்தில்","Before you buy":"வாங்கும் முன்","Four details worth checking.":"சரிபார்க்க வேண்டிய நான்கு விவரங்கள்.",
    "Check purity":"தூய்மையைச் சரிபார்க்கவும்","Match the fineness mark and verify the hallmark.":"தூய்மைக் குறியையும் ஹால்மார்க்கையும் சரிபார்க்கவும்.",
    "Check weight":"எடையைச் சரிபார்க்கவும்","Ask for net metal weight, with stones listed separately.":"கற்கள் தனியாகக் குறிப்பிடப்பட்ட நிகர உலோக எடையைக் கேளுங்கள்.",
    "Read the bill":"பில்லைப் படிக்கவும்","Separate metal value, making, other charges and taxes.":"உலோக மதிப்பு, செய்கூலி, மற்ற கட்டணங்கள், வரிகள் தனித்தனியாக உள்ளதா பாருங்கள்.",
    "Ask about resale":"மறுவிற்பனை பற்றி கேளுங்கள்","Get the seller’s buyback terms and deductions in writing.":"மீண்டும் வாங்கும் நிபந்தனைகள் மற்றும் கழிவுகளை எழுத்தில் பெறுங்கள்.",
    "Parts of a metal purchase bill":"உலோகம் வாங்கும் பில்லின் பகுதிகள்","Metal value":"உலோக மதிப்பு","Shop charges":"கடைச் செலவுகள்","Taxes":"வரிகள்","Invoice total":"பில் மொத்தம்",
    "Hallmark check ↗":"ஹால்மார்க் சரிபார்ப்பு ↗","Jewellery bill ↗":"நகை பில் ↗","Resale estimate ↗":"மறுவிற்பனை மதிப்பு ↗",
    "QUICK ANSWERS":"சுருக்கமான பதில்கள்","Make sense of the numbers":"விலைகளைப் புரிந்துகொள்ளுங்கள்",
    "Why is the shop price different?":"கடை விலை ஏன் வேறுபடுகிறது?",
    "IBJA is a national metal reference. A shop quote can also include local premiums, making charges, other items and taxes. Ask for an itemised bill.":"IBJA என்பது இந்திய உலோகக் குறிப்பு விலை. கடை விலையில் உள்ளூர் கூடுதல் தொகை, செய்கூலி, மற்ற பொருட்கள் மற்றும் வரிகளும் இருக்கலாம். விவரமான பில்லைக் கேளுங்கள்.",
    "How do I compare two quotes?":"இரண்டு விலைகளை எப்படி ஒப்பிடுவது?",
    "Use the same purity and net metal weight. Gold rates here are per 10 g; silver rates are per 1 kg. Use By Weight for a gram comparison.":"ஒரே தூய்மை மற்றும் நிகர உலோக எடையை ஒப்பிடவும். இங்கு தங்க விலை 10 கிராமுக்கும் வெள்ளி விலை 1 கிலோவுக்கும் காட்டப்படுகிறது. கிராம் ஒப்பீட்டுக்கு எடை வாரியாக பகுதியைப் பயன்படுத்தவும்.",
    "Why can tomorrow’s estimate equal today’s rate?":"நாளைய கணிப்பு ஏன் இன்றைய விலைக்கு சமமாக இருக்கலாம்?",
    "When other tested methods do not reliably beat the latest-price baseline, the model keeps that baseline. This is not a prediction that the market will stay unchanged.":"சோதிக்கப்பட்ட மற்ற முறைகள் கடைசி விலையைவிட நம்பகமான முடிவு தராவிட்டால், மாதிரி கடைசி விலையை அடிப்படையாகப் பயன்படுத்தும். சந்தை மாறாது என்று இதற்குப் பொருளல்ல.",
    "When is a forecast result final?":"கணிப்பின் முடிவு எப்போது இறுதியாகும்?",
    "The saved estimate is checked against its target-date IBJA PM close. Morning prices are provisional. Range coverage, price error and direction are different checks.":"சேமிக்கப்பட்ட கணிப்பு அதன் இலக்குத் தேதியின் IBJA மாலை முடிவு விலையுடன் சரிபார்க்கப்படும். காலை விலை தற்காலிகமானது. வரம்பு, விலை வேறுபாடு, திசை ஆகியவை தனித்தனி சோதனைகள்."
  });
  Object.assign(TA,{"Explore gold and silver":"தங்கம் மற்றும் வெள்ளியை அறியுங்கள்","Purity":"தூய்மை","Price drivers":"விலை மாற்றக் காரணங்கள்","Buying checklist":"வாங்கும் சரிபார்ப்பு","Quick answers":"சுருக்கமான பதில்கள்","What moves gold & silver?":"தங்கம், வெள்ளி விலையை மாற்றுவது என்ன?"});
  Object.assign(TA,{
    "Major city prices · 1 g":"முக்கிய நகர விலைகள் · 1 கிராம்",
    "Open official Goodreturns source":"அதிகாரப்பூர்வ Goodreturns மூலத்தைத் திறக்கவும்",
    "Open official IBJA source":"அதிகாரப்பூர்வ IBJA மூலத்தைத் திறக்கவும்",
    "Image hosted by India Bullion and Jewellers Association":"படம்: இந்திய தங்கம் மற்றும் நகைக்கடை சங்கம்",
    "Image hosted by Goodreturns":"படம்: Goodreturns",
    "Switch language to English":"ஆங்கில மொழிக்கு மாற்று",
    "Switch language to Tamil":"தமிழ் மொழிக்கு மாற்று",
    "24K gold":"24K தங்கம்","22K gold":"22K தங்கம்",
    "Gold tools":"தங்கக் கருவிகள்","Important:":"முக்கியம்:",
    "benchmark":"அடிப்படை விலை",
    "NextRate · Dated IBJA bullion references":"NextRate · தேதியிட்ட IBJA உலோகக் குறிப்பு விலைகள்",
    "Experimental forecasts are not investment advice. GST and retail premiums excluded.":"சோதனைக் கணிப்புகள் முதலீட்டு ஆலோசனை அல்ல. GST மற்றும் கடைக் கூடுதல் கட்டணங்கள் சேர்க்கப்படவில்லை.",
    "1 g · 8 g (Pavan) · 10 g":"1 கிராம் · 8 கிராம் (பவுன்) · 10 கிராம்",
    "The IBJA holiday calendar for the next publication year is not verified.":"அடுத்த ஆண்டிற்கான IBJA விடுமுறை நாட்கள் உறுதிப்படுத்தப்படவில்லை.",
    "Targets are checked when this page opens or regains focus. This tool does not send browser or phone notifications. No alert is triggered from rates older than 7 days.":"இந்தப் பக்கம் திறக்கப்படும்போதோ மீண்டும் கவனத்தில் வரும்போதோ இலக்குகள் சரிபார்க்கப்படும். உலாவி அல்லது கைபேசி அறிவிப்புகள் அனுப்பப்படாது. ஏழு நாட்களுக்கு மேல் பழைய விலைகளுக்கு எச்சரிக்கை வராது."
  });
  const keys=Object.keys(TA).sort((a,b)=>b.length-a.length);
  const patterns=new RegExp(keys.map(k=>
    (/^[A-Za-z0-9]/.test(k)?'(?<![A-Za-z0-9])':'')+
    k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+
    (/[A-Za-z0-9]$/.test(k)?'(?![A-Za-z0-9])':'')).join('|'),'g');
  const textOriginals=new WeakMap();
  const attrOriginals=new WeakMap();
  function translate(text,language){
    if(language!=="ta") return text;
    const normalized=String(text).replace(/(\d+(?:\.\d+)?)\s+grams of\b/g,'$1 கிராம்');
    return normalized.replace(patterns,match=>TA[match]);
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
