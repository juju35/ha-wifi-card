var WIFI_QR_CARD_VERSION = '__VERSION__';
var WIFI_BLUE = '#64B5F6';

// ── WiFi icon (original artwork: rounded-cap waves), shown in the round header badge ─
var WIFI_LOGO = '<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="4 4 28 28" role="img" aria-label="WiFi"><g fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M13.76 21.76A6 6 0 0 1 22.24 21.76"/><path d="M10.22 18.22A11 11 0 0 1 25.78 18.22"/><path d="M6.69 14.69A16 16 0 0 1 29.31 14.69"/></g><circle cx="18" cy="26.5" r="2.4" fill="currentColor"/></svg>';

// ── QR Code engine (pure JS, Reed-Solomon, no CDN) ───────────────────────────
// biome-ignore lint: vendored/minified third-party code
var QRErrorCorrectLevel={L:1,M:0,Q:3,H:2};function QRCodeModel(a,b){this.typeNumber=a;this.errorCorrectLevel=b;this.modules=null;this.moduleCount=0;this.dataCache=null;this.dataList=[]}QRCodeModel.prototype={addData:function(a){this.dataList.push(new QR8bitByte(a));this.dataCache=null},isDark:function(a,b){if(a<0||this.moduleCount<=a||b<0||this.moduleCount<=b)throw new Error(a+","+b);return this.modules[a][b]},getModuleCount:function(){return this.moduleCount},make:function(){this.makeImpl(false,this.getBestMaskPattern())},makeImpl:function(a,b){this.moduleCount=this.typeNumber*4+17;this.modules=function(a){var b=new Array(a);for(var c=0;c<a;c++){b[c]=new Array(a);for(var d=0;d<a;d++)b[c][d]=null}return b}(this.moduleCount);this.setupPositionProbePattern(0,0);this.setupPositionProbePattern(this.moduleCount-7,0);this.setupPositionProbePattern(0,this.moduleCount-7);this.setupPositionAdjustPattern();this.setupTimingPattern();this.setupTypeInfo(a,b);if(this.typeNumber>=7)this.setupTypeNumber(a);if(this.dataCache==null)this.dataCache=QRCodeModel.createData(this.typeNumber,this.errorCorrectLevel,this.dataList);this.mapData(this.dataCache,b)},setupPositionProbePattern:function(a,b){for(var c=-1;c<=7;c++){if(a+c<=-1||this.moduleCount<=a+c)continue;for(var d=-1;d<=7;d++){if(b+d<=-1||this.moduleCount<=b+d)continue;if((0<=c&&c<=6&&(d==0||d==6))||(0<=d&&d<=6&&(c==0||c==6))||(2<=c&&c<=4&&2<=d&&d<=4))this.modules[a+c][b+d]=true;else this.modules[a+c][b+d]=false}}},getBestMaskPattern:function(){var a=0,b=0;for(var c=0;c<8;c++){this.makeImpl(true,c);var d=QRUtil.getLostPoint(this);if(c==0||a>d){a=d;b=c}}return b},setupTimingPattern:function(){for(var a=8;a<this.moduleCount-8;a++)if(this.modules[a][6]==null)this.modules[a][6]=(a%2==0);for(var b=8;b<this.moduleCount-8;b++)if(this.modules[6][b]==null)this.modules[6][b]=(b%2==0)},setupPositionAdjustPattern:function(){var a=QRUtil.getPatternPosition(this.typeNumber);for(var b=0;b<a.length;b++)for(var c=0;c<a.length;c++){var d=a[b],e=a[c];if(this.modules[d][e]!=null)continue;for(var f=-2;f<=2;f++)for(var g=-2;g<=2;g++)if(f==-2||f==2||g==-2||g==2||(f==0&&g==0))this.modules[d+f][e+g]=true;else this.modules[d+f][e+g]=false}},setupTypeNumber:function(a){var b=QRUtil.getBCHTypeNumber(this.typeNumber);for(var c=0;c<18;c++){var d=(!a&&((b>>c)&1)==1);this.modules[Math.floor(c/3)][c%3+this.moduleCount-8-3]=d}for(var c=0;c<18;c++){var d=(!a&&((b>>c)&1)==1);this.modules[c%3+this.moduleCount-8-3][Math.floor(c/3)]=d}},setupTypeInfo:function(a,b){var c=(this.errorCorrectLevel<<3)|b,d=QRUtil.getBCHTypeInfo(c);for(var e=0;e<15;e++){var f=(!a&&((d>>e)&1)==1);if(e<6)this.modules[e][8]=f;else if(e<8)this.modules[e+1][8]=f;else this.modules[this.moduleCount-15+e][8]=f}for(var e=0;e<15;e++){var f=(!a&&((d>>e)&1)==1);if(e<8)this.modules[8][this.moduleCount-e-1]=f;else if(e<9)this.modules[8][15-e-1+1]=f;else this.modules[8][15-e-1]=f}this.modules[this.moduleCount-8][8]=(!a)},mapData:function(a,b){var c=-1,d=this.moduleCount-1,e=7,f=0;for(var g=this.moduleCount-1;g>0;g-=2){if(g==6)g--;while(true){for(var h=0;h<2;h++){if(this.modules[d][g-h]==null){var i=false;if(f<a.length)i=(((a[f]>>>(e))&1)==1);var j=QRUtil.getMask(b,d,g-h);if(j)i=!i;this.modules[d][g-h]=i;e--;if(e==-1){f++;e=7}}}d+=c;if(d<0||this.moduleCount<=d){d-=c;c=-c;break}}}}};QRCodeModel.PAD0=0xEC;QRCodeModel.PAD1=0x11;QRCodeModel.createData=function(a,b,c){var d=QRRSBlock.getRSBlocks(a,b),e=new QRBitBuffer;for(var f=0;f<c.length;f++){var g=c[f];e.put(g.mode,4);e.put(g.getLength(),QRUtil.getLengthInBits(g.mode,a));g.write(e)}var h=0;for(var f=0;f<d.length;f++)h+=d[f].dataCount;if(e.getLengthInBits()>h*8)throw new Error("code length overflow. ("+e.getLengthInBits()+">"+h*8+")");if(e.getLengthInBits()+4<=h*8)e.put(0,4);while(e.getLengthInBits()%8!=0)e.putBit(false);while(true){if(e.getLengthInBits()>=h*8)break;e.put(QRCodeModel.PAD0,8);if(e.getLengthInBits()>=h*8)break;e.put(QRCodeModel.PAD1,8)}return QRCodeModel.createBytes(e,d)};QRCodeModel.createBytes=function(a,b){var c=0,d=0,e=0,f=new Array(b.length),g=new Array(b.length);for(var h=0;h<b.length;h++){var i=b[h].dataCount,j=b[h].totalCount-i;d=Math.max(d,i);e=Math.max(e,j);f[h]=new Array(i);for(var k=0;k<f[h].length;k++)f[h][k]=0xff&a.buffer[k+c];c+=i;var l=QRUtil.getErrorCorrectPolynomial(j),m=new QRPolynomial(f[h],l.getLength()-1),n=m.mod(l);g[h]=new Array(l.getLength()-1);for(var k=0;k<g[h].length;k++){var o=k+n.getLength()-g[h].length;g[h][k]=(o>=0)?n.get(o):0}}var p=0;for(var h=0;h<b.length;h++)p+=b[h].totalCount;var q=new Array(p),r=0;for(var k=0;k<d;k++)for(var h=0;h<b.length;h++)if(k<f[h].length)q[r++]=f[h][k];for(var k=0;k<e;k++)for(var h=0;h<b.length;h++)if(k<g[h].length)q[r++]=g[h][k];return q};var QRUtil={PATTERN_POSITION_TABLE:[[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46],[6,28,50],[6,30,54],[6,32,58],[6,34,62],[6,26,46,66],[6,26,48,70],[6,26,50,74],[6,30,54,78],[6,30,56,82],[6,30,58,86],[6,34,62,90],[6,28,50,72,94],[6,26,50,74,98],[6,30,54,78,102],[6,28,54,80,106],[6,32,58,84,110],[6,30,58,86,114],[6,34,62,90,118],[6,26,50,74,98,122],[6,30,54,78,102,126],[6,26,52,78,104,130],[6,30,56,82,108,134],[6,34,60,86,112,138],[6,30,58,86,114,142],[6,34,62,90,118,146],[6,30,54,78,102,126,150],[6,24,50,76,102,128,154],[6,28,54,80,106,132,158],[6,32,58,84,110,136,162],[6,26,54,82,110,138,166],[6,30,58,86,114,142,170]],getBCHTypeInfo:function(a){var b=a<<10;while(QRUtil.getBCHDigit(b)-QRUtil.getBCHDigit(1335)>=0)b^=(1335<<(QRUtil.getBCHDigit(b)-QRUtil.getBCHDigit(1335)));return((a<<10)|b)^21522},getBCHTypeNumber:function(a){var b=a<<12;while(QRUtil.getBCHDigit(b)-QRUtil.getBCHDigit(7973)>=0)b^=(7973<<(QRUtil.getBCHDigit(b)-QRUtil.getBCHDigit(7973)));return(a<<12)|b},getBCHDigit:function(a){var b=0;while(a!=0){b++;a>>>=1}return b},getPatternPosition:function(a){return QRUtil.PATTERN_POSITION_TABLE[a-1]},getMask:function(a,b,c){switch(a){case 0:return(b+c)%2==0;case 1:return b%2==0;case 2:return c%3==0;case 3:return(b+c)%3==0;case 4:return(Math.floor(b/2)+Math.floor(c/3))%2==0;case 5:return(b*c)%2+(b*c)%3==0;case 6:return((b*c)%2+(b*c)%3)%2==0;case 7:return((b*c)%3+(b+c)%2)%2==0}},getErrorCorrectPolynomial:function(a){var b=new QRPolynomial([1],0);for(var c=0;c<a;c++)b=b.multiply(new QRPolynomial([1,QRMath.gexp(c)],0));return b},getLengthInBits:function(a,b){if(1<=b&&b<10){if(a==1)return 10;if(a==2)return 9;if(a==4)return 8;if(a==8)return 8;throw new Error("mode:"+a)}else if(b<27){if(a==1)return 12;if(a==2)return 11;if(a==4)return 16;if(a==8)return 10;throw new Error("mode:"+a)}else{if(a==1)return 14;if(a==2)return 13;if(a==4)return 16;if(a==8)return 12;throw new Error("mode:"+a)}},getLostPoint:function(a){var b=a.getModuleCount(),c=0;for(var d=0;d<b;d++){for(var e=0;e<b;e++){var f=0,g=a.isDark(d,e);for(var h=-1;h<=1;h++){if(d+h<0||b<=d+h)continue;for(var i=-1;i<=1;i++){if(e+i<0||b<=e+i)continue;if(h==0&&i==0)continue;if(g==a.isDark(d+h,e+i))f++}}if(f>5)c+=(3+f-5)}}for(var d=0;d<b-1;d++){for(var e=0;e<b-1;e++){var j=0;if(a.isDark(d,e))j++;if(a.isDark(d+1,e))j++;if(a.isDark(d,e+1))j++;if(a.isDark(d+1,e+1))j++;if(j==0||j==4)c+=3}}for(var d=0;d<b;d++){for(var e=0;e<b-6;e++){if(a.isDark(d,e)&&!a.isDark(d,e+1)&&a.isDark(d,e+2)&&a.isDark(d,e+3)&&a.isDark(d,e+4)&&!a.isDark(d,e+5)&&a.isDark(d,e+6))c+=40}}for(var e=0;e<b;e++){for(var d=0;d<b-6;d++){if(a.isDark(d,e)&&!a.isDark(d+1,e)&&a.isDark(d+2,e)&&a.isDark(d+3,e)&&a.isDark(d+4,e)&&!a.isDark(d+5,e)&&a.isDark(d+6,e))c+=40}}var k=0;for(var e=0;e<b;e++)for(var d=0;d<b;d++)if(a.isDark(d,e))k++;var l=Math.abs(100*k/b/b-50)/5;c+=l*10;return c}};var QRMath={gexp:function(a){while(a<0)a+=255;while(a>=256)a-=255;return QRMath.EXP_TABLE[a]},glog:function(a){if(a<1)throw new Error("glog("+a+")");return QRMath.LOG_TABLE[a]},EXP_TABLE:new Array(256),LOG_TABLE:new Array(256)};for(var i=0;i<8;i++)QRMath.EXP_TABLE[i]=1<<i;for(var i=8;i<256;i++)QRMath.EXP_TABLE[i]=QRMath.EXP_TABLE[i-4]^QRMath.EXP_TABLE[i-5]^QRMath.EXP_TABLE[i-6]^QRMath.EXP_TABLE[i-8];for(var i=0;i<255;i++)QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]]=i;function QRPolynomial(a,b){if(a.length==undefined)throw new Error(a.length+"/"+b);var c=0;while(c<a.length&&a[c]==0)c++;this.num=new Array(a.length-c+b);for(var d=0;d<a.length-c;d++)this.num[d]=a[d+c]}QRPolynomial.prototype={get:function(a){return this.num[a]},getLength:function(){return this.num.length},multiply:function(a){var b=new Array(this.getLength()+a.getLength()-1);for(var c=0;c<b.length;c++)b[c]=0;for(var c=0;c<this.getLength();c++)for(var d=0;d<a.getLength();d++)b[c+d]^=QRMath.gexp(QRMath.glog(this.get(c))+QRMath.glog(a.get(d)));return new QRPolynomial(b,0)},mod:function(a){if(this.getLength()-a.getLength()<0)return this;var b=QRMath.glog(this.get(0))-QRMath.glog(a.get(0));var c=new Array(this.getLength());for(var d=0;d<this.getLength();d++)c[d]=this.get(d);for(var d=0;d<a.getLength();d++)c[d]^=QRMath.gexp(QRMath.glog(a.get(d))+b);return new QRPolynomial(c,0).mod(a)}};function QRRSBlock(a,b){this.totalCount=a;this.dataCount=b}QRRSBlock.RS_BLOCK_TABLE=[[1,26,19],[1,26,16],[1,26,13],[1,26,9],[1,44,34],[1,44,28],[1,44,22],[1,44,16],[1,70,55],[1,70,44],[2,35,17],[2,35,13],[1,100,80],[2,50,32],[2,50,24],[4,25,9],[1,134,108],[2,67,43],[2,33,15,2,34,16],[2,33,11,2,34,12],[2,86,68],[4,43,27],[4,43,19],[4,43,15],[2,98,78],[4,49,31],[2,32,14,4,33,15],[4,39,13,1,40,14],[2,121,97],[2,60,38,2,61,39],[4,40,18,2,41,19],[4,40,14,2,41,15],[2,146,116],[3,58,36,2,59,37],[4,36,16,4,37,17],[4,36,12,4,37,13],[2,86,68,2,87,69],[4,69,43,1,70,44],[6,43,19,2,44,20],[6,43,15,2,44,16],[4,101,81],[1,80,50,4,81,51],[4,50,22,4,51,23],[3,36,12,8,37,13],[2,116,92,2,117,93],[6,58,36,2,59,37],[4,46,20,6,47,21],[7,42,14,4,43,15],[4,133,107],[8,59,37,1,60,38],[8,44,20,4,45,21],[12,33,11,4,34,12],[3,145,115,1,146,116],[4,64,40,5,65,41],[11,36,16,5,37,17],[11,36,12,5,37,13],[5,109,87,1,110,88],[5,65,41,5,66,42],[5,54,24,7,55,25],[11,36,12,7,37,13],[5,122,98,1,123,99],[7,73,45,3,74,46],[15,43,19,2,44,20],[3,45,15,13,46,16],[1,135,107,5,136,108],[10,74,46,1,75,47],[1,50,22,15,51,23],[2,42,14,17,43,15],[5,150,120,1,151,121],[9,69,43,4,70,44],[17,50,22,1,51,23],[2,42,14,19,43,15],[3,141,113,4,142,114],[3,70,44,11,71,45],[17,47,21,4,48,22],[9,39,13,16,40,14],[3,135,107,5,136,108],[3,67,41,13,68,42],[15,54,24,5,55,25],[15,43,15,10,44,16],[4,144,116,4,145,117],[17,68,42],[17,50,22,6,51,23],[19,46,16,6,47,17],[2,139,111,7,140,112],[17,74,46],[7,54,24,16,55,25],[34,37,13],[4,151,121,5,152,122],[4,75,47,14,76,48],[11,54,24,14,55,25],[16,45,15,14,46,16],[6,147,117,4,148,118],[6,73,45,14,74,46],[11,54,24,16,55,25],[30,46,16,2,47,17],[8,132,106,4,133,107],[8,75,47,13,76,48],[7,54,24,22,55,25],[22,45,15,13,46,16],[10,142,114,2,143,115],[19,74,46,4,75,47],[28,50,22,6,51,23],[33,46,16,4,47,17],[8,152,122,4,153,123],[22,73,45,3,74,46],[8,53,23,26,54,24],[12,45,15,28,46,16],[3,147,117,10,148,118],[3,73,45,23,74,46],[4,54,24,31,55,25],[11,45,15,31,46,16],[7,146,116,7,147,117],[21,73,45,7,74,46],[1,53,23,37,54,24],[19,45,15,26,46,16],[5,145,115,10,146,116],[19,75,47,10,76,48],[15,54,24,25,55,25],[23,45,15,25,46,16],[13,145,115,3,146,116],[2,74,46,29,75,47],[42,54,24,1,55,25],[23,45,15,28,46,16],[17,145,115],[10,74,46,23,75,47],[10,54,24,35,55,25],[19,45,15,35,46,16],[17,145,115,1,146,116],[14,74,46,21,75,47],[29,54,24,19,55,25],[11,45,15,46,46,16],[13,145,115,6,146,116],[14,74,46,23,75,47],[44,54,24,7,55,25],[59,46,16,1,47,17],[12,151,121,7,152,122],[12,75,47,26,76,48],[39,54,24,14,55,25],[22,45,15,41,46,16],[6,151,121,14,152,122],[6,75,47,34,76,48],[46,54,24,10,55,25],[2,45,15,64,46,16],[17,152,122,4,153,123],[29,74,46,14,75,47],[49,54,24,10,55,25],[24,45,15,46,46,16],[4,152,122,18,153,123],[13,74,46,32,75,47],[48,54,24,14,55,25],[42,45,15,32,46,16],[20,147,117,4,148,118],[40,75,47,7,76,48],[43,54,24,22,55,25],[10,45,15,67,46,16],[19,148,118,6,149,119],[18,75,47,31,76,48],[34,54,24,34,55,25],[20,45,15,61,46,16]];QRRSBlock.getRSBlocks=function(a,b){var c=QRRSBlock.getRsBlockTable(a,b);if(c==undefined)throw new Error("bad rs block @ typeNumber:"+a+"/errorCorrectLevel:"+b);var d=c.length/3,e=[];for(var f=0;f<d;f++){var g=c[f*3+0],h=c[f*3+1],i=c[f*3+2];for(var j=0;j<g;j++)e.push(new QRRSBlock(h,i))}return e};QRRSBlock.getRsBlockTable=function(a,b){switch(b){case 1:return QRRSBlock.RS_BLOCK_TABLE[(a-1)*4+0];case 0:return QRRSBlock.RS_BLOCK_TABLE[(a-1)*4+1];case 3:return QRRSBlock.RS_BLOCK_TABLE[(a-1)*4+2];case 2:return QRRSBlock.RS_BLOCK_TABLE[(a-1)*4+3]}};function QRBitBuffer(){this.buffer=[];this.length=0}QRBitBuffer.prototype={get:function(a){var b=Math.floor(a/8);return((this.buffer[b]>>>(7-a%8))&1)==1},put:function(a,b){for(var c=0;c<b;c++)this.putBit(((a>>>(b-c-1))&1)==1)},getLengthInBits:function(){return this.length},putBit:function(a){var b=Math.floor(this.length/8);if(this.buffer.length<=b)this.buffer.push(0);if(a)this.buffer[b]|=(0x80>>>(this.length%8));this.length++}};function QR8bitByte(a){this.mode=4;this.data=a}QR8bitByte.prototype={getLength:function(){return unescape(encodeURIComponent(this.data)).length},write:function(a){var b=unescape(encodeURIComponent(this.data));for(var c=0;c<b.length;c++)a.put(b.charCodeAt(c),8)}};

// ── i18n ──────────────────────────────────────────────────────────────────────
var WifiQrI18n = {
  fr: {
    default_title: 'Wifi invité',
    network: 'Réseau',
    password: 'Mot de passe',
    hint: 'Scannez le QR code pour vous connecter',
    zoom: 'Agrandir le QR code',
    open_network: 'Réseau ouvert (sans mot de passe)',
    show_password: 'Afficher le mot de passe',
    hide_password: 'Masquer le mot de passe',
    ed_title: 'Titre',
    ed_ssid: 'Nom du réseau (SSID)',
    ed_password: 'Mot de passe',
    ed_security: 'Sécurité',
    ed_qr_size: 'Taille du QR code',
    ed_language: 'Langue',
    ed_title_helper: 'Laisser vide pour le titre par défaut',
    ed_password_helper: 'Inutile si la sécurité est « Aucune »',
    ed_qr_size_helper: 'Zone blanche incluse — 176 px par défaut',
    ed_language_helper: 'Laisser vide pour suivre la langue de Home Assistant',
    ed_logo: 'Afficher le logo WiFi',
    sec_wpa: 'WPA / WPA2',
    sec_sae: 'WPA3 (SAE)',
    sec_wep: 'WEP',
    sec_nopass: 'Aucune (réseau ouvert)',
  },
  en: {
    default_title: 'Guest WiFi',
    network: 'Network',
    password: 'Password',
    hint: 'Scan the QR code to connect automatically',
    zoom: 'Enlarge QR code',
    open_network: 'Open network (no password)',
    show_password: 'Show password',
    hide_password: 'Hide password',
    ed_title: 'Title',
    ed_ssid: 'Network name (SSID)',
    ed_password: 'Password',
    ed_security: 'Security',
    ed_qr_size: 'QR code size',
    ed_language: 'Language',
    ed_title_helper: 'Leave empty for the default title',
    ed_password_helper: 'Not needed when security is "None"',
    ed_qr_size_helper: 'Quiet zone included — defaults to 176 px',
    ed_language_helper: 'Leave empty to follow the Home Assistant language',
    ed_logo: 'Show the WiFi logo',
    sec_wpa: 'WPA / WPA2',
    sec_sae: 'WPA3 (SAE)',
    sec_wep: 'WEP',
    sec_nopass: 'None (open network)',
  },
};

function wifiQrEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function wifiQrT(lang, key) {
  var strings = WifiQrI18n[lang] || WifiQrI18n.en;
  return strings[key] || WifiQrI18n.en[key] || key;
}

var SECURITY_KEYS = { WPA: 'sec_wpa', SAE: 'sec_sae', WEP: 'sec_wep', nopass: 'sec_nopass' };
// Spellings people write in YAML, mapped to the T: values phones understand.
var SECURITY_ALIASES = { wpa: 'WPA', wpa2: 'WPA', 'wpa/wpa2': 'WPA', sae: 'SAE', wpa3: 'SAE', wep: 'WEP', nopass: 'nopass', none: 'nopass', open: 'nopass' };

function wifiQrSecurity(value) {
  if (value == null || value === '') return 'WPA';
  var sec = SECURITY_ALIASES[String(value).toLowerCase()];
  if (!sec) throw new Error('security must be WPA, SAE, WEP or nopass');
  return sec;
}

// Escapes the characters reserved by the WIFI: format (backslash, ; , : and ").
function wifiQrField(s) {
  return String(s).replace(/([\\;,:"])/g, '\\$1');
}

function wifiQrString(c) {
  var isOpen = c.security === 'nopass';
  return `WIFI:T:${c.security};S:${wifiQrField(c.ssid)};P:${isOpen ? '' : wifiQrField(c.password)};;`;
}

// Smallest QR version (level M, single 8-bit segment) whose data area fits `bytes`
// bytes, computed from the library's own RS block table. Lets _buildQrSvg start at
// the right version instead of building and discarding up to 39 undersized models.
function wifiQrMinVersion(bytes) {
  for (var t = 1; t <= 40; t++) {
    var blocks = QRRSBlock.getRSBlocks(t, QRErrorCorrectLevel.M);
    var capacity = 0;
    for (var i = 0; i < blocks.length; i++) capacity += blocks[i].dataCount;
    // 4 mode bits + the version-dependent length field, then the payload itself.
    if (4 + QRUtil.getLengthInBits(4, t) + bytes * 8 <= capacity * 8) return t;
  }
  return 40;
}

// ── wifi-qr-card ──────────────────────────────────────────────────────────────
class WifiQrCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('wifi-qr-card-editor');
  }

  static getStubConfig() {
    return { ssid: 'MyNetwork-Guest', password: 'MySecretPassword' };
  }

  setConfig(config) {
    if (config.ssid == null || config.ssid === '') throw new Error('ssid is required');
    // Validated before the config is kept: an invalid value must not reach set hass later.
    var security = wifiQrSecurity(config.security);
    if ((config.password == null || config.password === '') && security !== 'nopass') throw new Error('password is required');
    // YAML reads an unquoted 01234567 as the number 1234567: the leading zero is lost before
    // the card sees it, so the most we can do is point at the quotes.
    if (typeof config.password === 'number' && !this._warnedNumber) {
      this._warnedNumber = true;
      console.warn('wifi-qr-card: password is a number; quote it in YAML if it starts with 0 (password: "01234567")');
    }
    this._configRaw = config;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._applyConfig(true);
  }

  set hass(hass) {
    var prevLang = this._hassLang;
    // Normalise a regional locale (fr-BE, en-GB…) to its base, like the editor and document lang do,
    // so WifiQrI18n is matched instead of silently falling back to English.
    this._hassLang = hass?.language ? hass.language.split('-')[0] : null;
    if (this._configRaw && prevLang !== this._hassLang) this._applyConfig();
  }

  _getLang() {
    if (this._configRaw?.language) return this._configRaw.language;
    if (this._hassLang) return this._hassLang;
    var docLang = document.documentElement.lang;
    if (docLang) return docLang.split('-')[0];
    return 'en';
  }

  _t(key) {
    return wifiQrT(this._getLang(), key);
  }

  // strict: let errors reach setConfig (the editor shows them); otherwise show them in the card.
  _applyConfig(strict) {
    var config = this._configRaw;
    this._config = {
      ssid: String(config.ssid),
      password: config.password == null ? '' : String(config.password),
      security: wifiQrSecurity(config.security),
      title: config.title || this._t('default_title'),
      qr_size: Number(config.qr_size) > 0 ? Number(config.qr_size) : null,
      logo: config.logo !== false,
    };
    this._render(strict);
  }

  _buildQrSvg(text, size) {
    // UTF-8 byte length, exactly as QR8bitByte counts it.
    const bytes = unescape(encodeURIComponent(text)).length;
    let qr = null;
    for (let t = wifiQrMinVersion(bytes); t <= 40 && !qr; t++) {
      try {
        const q = new QRCodeModel(t, QRErrorCorrectLevel.M);
        q.addData(text);
        q.make();
        qr = q;
      } catch (e) {
        // Too small for the payload: try the next version; anything else is a bug
        if (!/code length overflow/.test(e?.message)) throw e;
      }
    }
    if (!qr) throw new Error('WiFi data is too long for a QR code');
    const n = qr.getModuleCount();
    const quiet = 4; // quiet zone required by the QR spec, in modules
    const dim = n + quiet * 2;
    let d = '';
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c + quiet} ${r + quiet}h1v1h-1z`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="${dim}" height="${dim}" fill="${WIFI_BLUE}"/><path fill="#000" d="${d}"/></svg>`;
  }

  _render(strict) {
    const c = this._config;
    const isOpen = c.security === 'nopass';
    let svg;
    try {
      svg = this._buildQrSvg(wifiQrString(c), c.qr_size || 176);
    } catch (err) {
      if (strict) throw err;
      this.shadowRoot.innerHTML = `<ha-card><div style="padding:16px;color:var(--error-color)">${wifiQrEsc(err.message)}</div></ha-card>`;
      return;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: 100%; }
        ha-card { height: 100%; box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; gap: 10px; }
        .header { display: flex; align-items: center; gap: 10px; align-self: flex-start; width: 100%; margin-bottom: -2px; }
        .badge { width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; flex: none;
                 --c: ${WIFI_BLUE}; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
        .badge .logo { width: 24px; height: 24px; display: block; }
        .badge ha-icon { color: inherit; --mdc-icon-size: 24px; }
        .titles { flex: 1; min-width: 0; }
        .name { font-size: 16px; font-weight: 500; line-height: 1.25; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sub { font-size: 12px; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        ha-icon { color: var(--secondary-text-color); --mdc-icon-size: 22px; }
        .qr-wrap { background: ${WIFI_BLUE}; border-radius: 10px; overflow: hidden; line-height: 0; max-width: 100%; cursor: zoom-in; }
        .qr-wrap svg { max-width: 100%; height: auto; width: ${c.qr_size ? `${c.qr_size}px` : '176px'}; }
        dialog { border: none; padding: 0; margin: auto; background: ${WIFI_BLUE}; border-radius: 12px; line-height: 0; overflow: hidden; cursor: zoom-out; }
        dialog::backdrop { background: rgba(0,0,0,0.85); }
        dialog svg { width: min(90vw, 90vh); height: auto; display: block; }
        .info-block { width: 100%; display: flex; flex-direction: column; gap: 6px; }
        .info-row { background: var(--secondary-background-color, rgba(127,127,127,.08)); border-radius: 10px; padding: 6px 10px; }
        .lbl { font-size: 11px; color: var(--secondary-text-color); margin-bottom: 0; }
        .val { font-size: 13px; font-weight: 500; font-family: var(--code-font-family, monospace); word-break: break-all; color: var(--primary-text-color); }
        .pwd-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        button { background: none; border: none; cursor: pointer; padding: 0; display: flex; align-items: center; }
        .hint { font-size: 11px; color: var(--secondary-text-color); text-align: center; }
      </style>
      <ha-card>
        <div class="header">
          <div class="badge">${c.logo ? WIFI_LOGO : '<ha-icon icon="mdi:wifi"></ha-icon>'}</div>
          <div class="titles">
            <div class="name">${wifiQrEsc(c.title)}</div>
            <div class="sub">${wifiQrEsc(this._t(SECURITY_KEYS[c.security] || 'sec_wpa'))}</div>
          </div>
        </div>
        <div class="qr-wrap" id="qr" role="button" tabindex="0" title="${this._t('zoom')}" aria-label="${this._t('zoom')}">${svg.replace('<svg ', '<svg aria-hidden="true" ')}</div>
        <dialog id="zoom" aria-label="${this._t('zoom')}">${svg}</dialog>
        <div class="info-block">
          <div class="info-row">
            <div class="lbl">${this._t('network')}</div>
            <div class="val">${wifiQrEsc(c.ssid)}</div>
          </div>
          <div class="info-row">
            <div class="lbl">${this._t('password')}</div>
            ${isOpen
              ? `<div class="val">${this._t('open_network')}</div>`
              : `<div class="pwd-row">
              <div class="val" id="pwd">••••••••••••••••</div>
              <button id="btn" aria-label="${this._t('show_password')}" aria-pressed="false"><ha-icon icon="mdi:eye" id="ico"></ha-icon></button>
            </div>`}
          </div>
        </div>
        <div class="hint">${this._t('hint')}</div>
      </ha-card>`;

    if (!isOpen) {
      let shown = false;
      const btn = this.shadowRoot.getElementById('btn');
      btn.onclick = () => {
        shown = !shown;
        btn.setAttribute('aria-pressed', String(shown));
        btn.setAttribute('aria-label', this._t(shown ? 'hide_password' : 'show_password'));
        this.shadowRoot.getElementById('pwd').textContent = shown ? c.password : '••••••••••••••••';
        this.shadowRoot.getElementById('ico').setAttribute('icon', shown ? 'mdi:eye-off' : 'mdi:eye');
      };
    }

    const qr = this.shadowRoot.getElementById('qr');
    const dlg = this.shadowRoot.getElementById('zoom');
    const open = () => { if (!dlg.open) dlg.showModal(); };
    qr.onclick = open;
    qr.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } };
    // Escape is handled natively by <dialog>; a click anywhere (QR or backdrop) closes it
    dlg.onclick = () => dlg.close();
  }

  getCardSize() { return 4; }

  getGridOptions() {
    return { columns: 6, min_columns: 4 };
  }
}

// ── wifi-qr-card-editor (visual editor, built on HA's ha-form) ───────────────
var WIFI_QR_EDITOR_DEFAULTS = { security: 'WPA', qr_size: 176, logo: true };

class WifiQrCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = Object.assign({}, config);
    this._render();
  }

  set hass(hass) {
    var prevLang = this._hass?.language;
    this._hass = hass;
    if (this._form && prevLang === (hass?.language)) {
      this._form.hass = hass;
    } else {
      this._render();
    }
  }

  _lang() {
    var lang = this._hass?.language ? this._hass.language.split('-')[0] : 'en';
    return WifiQrI18n[lang] ? lang : 'en';
  }

  _schema() {
    var t = (k) => wifiQrT(this._lang(), k);
    return [
      { name: 'title', selector: { text: {} } },
      { name: 'logo', selector: { boolean: {} } },
      { name: 'ssid', required: true, selector: { text: {} } },
      { name: 'password', selector: { text: { type: 'password' } } },
      {
        type: 'grid',
        name: '',
        schema: [
          {
            name: 'security',
            selector: {
              select: {
                mode: 'dropdown',
                options: [
                  { value: 'WPA', label: t('sec_wpa') },
                  { value: 'SAE', label: t('sec_sae') },
                  { value: 'WEP', label: t('sec_wep') },
                  { value: 'nopass', label: t('sec_nopass') },
                ],
              },
            },
          },
          {
            name: 'qr_size',
            selector: { number: { min: 100, max: 600, step: 10, mode: 'box', unit_of_measurement: 'px' } },
          },
        ],
      },
      {
        name: 'language',
        selector: {
          select: {
            mode: 'dropdown',
            options: [
              { value: 'fr', label: 'Français' },
              { value: 'en', label: 'English' },
            ],
          },
        },
      },
    ];
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.addEventListener('value-changed', (ev) => this._valueChanged(ev));
      this.appendChild(this._form);
    }
    var lang = this._lang();
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.computeLabel = (s) => wifiQrT(lang, `ed_${s.name}`);
    this._form.computeHelper = (s) => {
      var key = `ed_${s.name}_helper`;
      var txt = wifiQrT(lang, key);
      return txt === key ? undefined : txt;
    };
    // Show the defaults as set, so the fields match what the card does.
    this._form.data = Object.assign({}, WIFI_QR_EDITOR_DEFAULTS, this._config);
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    var value = Object.assign({}, ev.detail.value);
    // Keep the YAML short: drop options left empty or at their default.
    Object.keys(value).forEach((key) => {
      if (value[key] === '' || value[key] === null || value[key] === undefined) delete value[key];
    });
    Object.keys(WIFI_QR_EDITOR_DEFAULTS).forEach((key) => {
      if (value[key] === WIFI_QR_EDITOR_DEFAULTS[key]) delete value[key];
    });
    if (value.security === 'nopass') delete value.password;
    if (this._config.type) value = Object.assign({ type: this._config.type }, value);
    this._config = value;
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: value }, bubbles: true, composed: true }));
  }
}

if (!customElements.get('wifi-qr-card-editor')) {
  customElements.define('wifi-qr-card-editor', WifiQrCardEditor);
}

if (!customElements.get('wifi-qr-card')) {
  customElements.define('wifi-qr-card', WifiQrCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: 'wifi-qr-card',
    name: 'Wifi QR Card',
    description: 'QR code WiFi — no CDN',
    preview: true,
    documentationURL: 'https://github.com/juju35/ha-wifi-card',
  });
  console.info(`%c WIFI-QR-CARD %c v${WIFI_QR_CARD_VERSION} `, 'color:#fff;background:#1976D2;font-weight:700', 'color:#1976D2;background:#fff');
}
