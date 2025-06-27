document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('firewall-graph');
    let cy = null;
    let currentJsonData = null;
    let selectedElementForInfo = null;

    function displayNotification(message, type = 'info', duration = 4000) { /* ... (as before) ... */
        const notificationContainer = document.getElementById('custom-notification-container') || createNotificationContainer();
        const notificationId = 'notification-' + Date.now();
        const notificationDiv = document.createElement('div');
        notificationDiv.className = `app-notification ${type}`; notificationDiv.id = notificationId;
        const messageP = document.createElement('p'); messageP.textContent = message; notificationDiv.appendChild(messageP);
        const closeBtn = document.createElement('button'); closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => { notificationDiv.classList.remove('visible'); setTimeout(() => notificationDiv.remove(), 300); };
        notificationDiv.appendChild(closeBtn); notificationContainer.appendChild(notificationDiv);
        setTimeout(() => notificationDiv.classList.add('visible'), 50);
        if (duration > 0) { setTimeout(() => { notificationDiv.classList.remove('visible'); setTimeout(() => notificationDiv.remove(), 300); }, duration); }
    }
    function createNotificationContainer() { /* ... (as before) ... */
        let cont = document.getElementById('custom-notification-container');
        if (!cont) {
            cont = document.createElement('div'); cont.id = 'custom-notification-container';
            cont.style.position = 'fixed'; cont.style.top = '20px'; cont.style.right = '20px';
            cont.style.zIndex = '2000'; cont.style.display = 'flex';
            cont.style.flexDirection = 'column'; cont.style.gap = '10px';
            document.body.appendChild(cont);
        }
        if (!document.getElementById('dynamic-notification-styles')) {
            const ss = document.createElement("style"); ss.id = 'dynamic-notification-styles';
            ss.innerText = `
                .app-notification{padding:12px 18px;border-radius:5px;color:white;min-width:280px;max-width:400px;box-shadow:0 3px 12px rgba(0,0,0,0.2);opacity:0;transform:translateX(110%);transition:opacity .35s ease-out,transform .35s ease-out;display:flex;justify-content:space-between;align-items:center;font-size:14px;}
                .app-notification.visible{opacity:1;transform:translateX(0);}
                .app-notification p{margin:0;flex-grow:1;line-height:1.4;}
                .app-notification button{background:0 0;border:0;color:inherit;opacity:.7;font-size:1.5em;cursor:pointer;padding:0 0 0 10px;line-height:1}
                .app-notification button:hover{opacity:1}
                .app-notification.info{background-color:#007bff} .app-notification.success{background-color:#28a745}
                .app-notification.error{background-color:#dc3545} .app-notification.warning{background-color:#ffc107;color:#333}
                .app-notification.warning button{color:#333}`;
            document.head.appendChild(ss);
        }
        return cont;
    }
    createNotificationContainer();
    function lightenDarkenColor(col, amt) { /* ... (as before) ... */
        if (!col) return '#CCCCCC'; let usePound = false;
        if (col.startsWith("#")) { col = col.slice(1); usePound = true; }
        if (col.length === 3) col = col.split('').map(char => char + char).join('');
        if (col.length !== 6) return usePound? '#CCCCCC' : 'CCCCCC';
        const num = parseInt(col, 16);
        let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
        let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
        let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
        const toHex = (c) => ('00' + c.toString(16)).slice(-2);
        return (usePound ? "#" : "") + toHex(r) + toHex(b) + toHex(g);
    }
    function isColorDark(hexcolor){ /* ... (as before) ... */
        if (!hexcolor) return false;
        if (hexcolor.startsWith('#')) hexcolor = hexcolor.slice(1);
        if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(char => char + char).join('');
        if (hexcolor.length !== 6) return false;
        const r = parseInt(hexcolor.substr(0,2),16), g = parseInt(hexcolor.substr(2,2),16), b = parseInt(hexcolor.substr(4,2),16);
        return (0.299*r + 0.587*g + 0.114*b)/255 < 0.5;
    }

    function transformDataForCytoscape(jsonData) { /* ... (as in previous step, with group parents) ... */
        const elements = []; if (!jsonData) return elements;
        const objectMap=new Map((jsonData.objects||[]).map(o=>[o.id,o])),groupMap=new Map((jsonData.groups||[]).map(g=>[g.id,g])),tagMap=new Map((jsonData.tags||[]).map(t=>[t.id,t])),zoneMap=new Map((jsonData.zones||[]).map(z=>[z.id,z]));
        (jsonData.zones||[]).forEach(z=>{elements.push({group:'nodes',data:{id:`zone-${z.id}`,name:z.name,is_zone_parent:true,label:z.name,zone_color:z.color||'#E0E0E0',description:z.description||''}});});
        (jsonData.groups||[]).forEach(g=>{const gTags=(g.tags||[]).map(tId=>tagMap.get(tId)).filter(t=>t),gTagNames=gTags.map(t=>t.name);let gLbl=g.name;if(gTagNames.length>0)gLbl+=`\n[${gTagNames.join(',')}]`;elements.push({group:'nodes',data:{id:`group-${g.id}`,name:g.name,is_group_parent:true,label:gLbl,raw_tags:g.tags||[],tag_names:gTagNames,tag_objects:gTags}});});
        (jsonData.objects||[]).forEach(obj=>{
            const objTags=(obj.tags||[]).map(tId=>tagMap.get(tId)).filter(t=>t),objTagNames=objTags.map(t=>t.name);
            let lblTxt=`${obj.name}`;if(obj.value&&obj.type!=='any')lblTxt+=`\n(${obj.value})`;if(objTagNames.length>0){const tDisp=objTagNames.length>1?`[${objTagNames[0].substring(0,5)}..]`:`[${objTagNames.join(',')}]`;lblTxt+=`\n${tDisp}`;}
            const zD=zoneMap.get(obj.zone),objZClr=zD?.color||'#E0E0E0';let objBClr=lightenDarkenColor(objZClr,-35),objBW=1.5;if(objTags.length>0&&objTags[0].color){objBClr=objTags[0].color;objBW=3;}
            let pId;for(const grp of jsonData.groups||[]){if((grp.members||[]).includes(obj.id)){pId=`group-${grp.id}`;break;}}if(!pId&&zD)pId=`zone-${obj.zone}`;
            elements.push({group:'nodes',data:{id:obj.id,name:obj.name,value:obj.value,type:obj.type,raw_zone_id:obj.zone,zone_name:zD?.name||obj.zone,zone_color:objZClr,raw_tags:obj.tags||[],tag_names:objTagNames,tag_objects:objTags,label:lblTxt,parent:pId,style_border_color:objBClr,style_border_width:objBW,style_font_color:isColorDark(objZClr)?'#FFF':'#333'}});
        });
        (jsonData.rules||[]).forEach(rule=>{if(!rule.enabled)return;let srcs=[];(rule.source_objects||[]).forEach(sId=>{if(groupMap.has(sId))srcs.push(...(groupMap.get(sId).members||[]));else if(objectMap.has(sId))srcs.push(sId);});srcs=[...new Set(srcs)];let dests=[];(rule.destination_objects||[]).forEach(dId=>{if(groupMap.has(dId))dests.push(...(groupMap.get(dId).members||[]));else if(objectMap.has(dId))dests.push(dId);});dests=[...new Set(dests)];if(srcs.length===0||dests.length===0)return;
            const rTags=(rule.tags||[]).map(tId=>tagMap.get(tId)).filter(t=>t),rTagNames=rTags.map(t=>t.name);let srvLblPart=(rule.services||[]).map(s=>`${s.protocol}:${s.destination_port}`).join(',\n');let eLblTxt=srvLblPart;if(rTagNames.length>0){const tDisp=rTagNames.length>1?`[${rTagNames[0].substring(0,5)}..]`:`[${rTagNames.join(',')}]`;eLblTxt+=`\n${tDisp}`;}
            const srcZnN=[...new Set((rule.source_zone||[]).map(zId=>zoneMap.get(zId)?.name||zId))].join(', '),dstZnN=[...new Set((rule.destination_zone||[]).map(zId=>zoneMap.get(zId)?.name||zId))].join(', ');let eTT=`<b>Rule: ${rule.name||rule.id}</b><br>Action: ${rule.action.toUpperCase()}<br>Services: ${srvLblPart.replace(/\n/g,', ')}<br>From: ${srcZnN}<br>To: ${dstZnN}<br>Tags: ${rTagNames.join(', ')||'None'}`;if(rule.description)eTT+=`<br>Desc: ${rule.description}`;
            srcs.forEach(sId=>{if(!elements.find(el=>el.group==='nodes'&&el.data.id===sId&&!el.data.is_zone_parent&&!el.data.is_group_parent))return;dests.forEach(dId=>{if(!elements.find(el=>el.group==='nodes'&&el.data.id===dId&&!el.data.is_zone_parent&&!el.data.is_group_parent)||sId===dId)return;const eId=`${rule.id}-${sId}-${dId}`;elements.push({group:'edges',data:{id:eId,source:sId,target:dId,rule_id:rule.id,rule_name:rule.name||rule.id,action:rule.action,services_str:srvLblPart,label:eLblTxt,tooltip_text:eTT,raw_tags:rule.tags||[],tag_names:rTagNames,tag_objects:rTags}});});});
        });
        return elements;
    }

    function drawGraph(jsonData) {
        const elements=transformDataForCytoscape(jsonData);const graphContainer=document.getElementById('firewall-graph');if(!graphContainer){displayNotification('Error: Graph container not found.','error',0);return;}if(cy){cy.destroy();cy=null;}
        try{
            cy=cytoscape({container:graphContainer,elements:elements,
                style:[ /* ... (Stylesheet from previous step, including highlight classes) ... */
                    {selector:'node[!is_zone_parent][!is_group_parent]',style:{'background-color':'data(zone_color)','label':'data(label)','text-wrap':'wrap','text-valign':'center','text-halign':'center','text-max-width':'75px','font-size':'8px','color':'data(style_font_color)','width':'auto','height':'auto','shape':'round-rectangle','border-width':'data(style_border_width)','border-color':'data(style_border_color)','padding':'7px'}},
                    {selector:'node[?is_zone_parent]',style:{'background-color':'data(zone_color)','label':'data(label)','font-weight':'bold','font-size':'13px','text-valign':'top','text-halign':'center','text-margin-y':4,'border-width':1.5,'border-color':ele=>lightenDarkenColor(ele.data('zone_color'),-40),'shape':'rectangle','color':ele=>isColorDark(ele.data('zone_color'))?'#FFF':'#222','text-outline-width':1,'text-outline-color':ele=>isColorDark(ele.data('zone_color'))?'#333':'#FFF','padding':'25px 15px 15px 15px','compound-sizing-wrt-labels':'include','min-width':'100px','min-height':'80px'}},
                    {selector:'node[?is_group_parent]',style:{'background-color':'#ECEFF1','background-opacity':0.6,'label':'data(label)','font-weight':'500','font-size':'11px','text-valign':'top','text-halign':'center','text-margin-y':3,'border-width':1.5,'border-style':'dotted','border-color':'#546E7A','shape':'round-rectangle','color':'#37474F','text-outline-width':0,'padding':'20px 10px 10px 10px','compound-sizing-wrt-labels':'include','min-width':'70px','min-height':'50px'}},
                    {selector:'edge',style:{'width':1.2,'line-color':'#b0bec5','target-arrow-shape':'triangle','target-arrow-color':'#b0bec5','curve-style':'bezier','label':'data(label)','font-size':'7px','color':'#455a64','text-rotation':'autorotate','text-margin-y':-4,'text-wrap':'wrap','text-max-width':'50px','text-background-opacity':.85,'text-background-color':'#FFF','text-background-padding':'1px','text-background-shape':'round-rectangle','arrow-scale':.7,'z-index': 1 }},
                    {selector:'edge[action="deny"]',style:{'line-color':'#e53935','target-arrow-color':'#e53935','line-style':'dashed'}},
                    {selector:'edge[action="allow"]',style:{'line-color':'#43a047','target-arrow-color':'#43a047'}},
                    {selector:':selected',style:{'border-width':2.5,'border-color':'#007bff','line-color':'#007bff','target-arrow-color':'#007bff','source-arrow-color':'#007bff','overlay-color':'#007bff','overlay-opacity':.1,'overlay-padding':'5px','z-index': 99 }},
                    {selector:'node:selected', style: {'z-index': 100}},
                    {selector:'node:hover',style:{'border-color':'#0056b3','cursor':'pointer','shadow-blur':10,'shadow-color':'#0056b3','shadow-opacity':0.3}},
                    {selector:'edge:hover',style:{'line-color':'#0056b3','target-arrow-color':'#0056b3','source-arrow-color':'#0056b3','cursor':'pointer','shadow-blur':8,'shadow-color':'#0056b3','shadow-opacity':0.3, 'z-index': 98}},
                    {selector:'.highlighted',style:{'overlay-color':'#e74c3c','overlay-opacity':0.25,'overlay-padding':'6px','z-index':10}},
                    {selector:'node.traffic-path-node',style:{'background-color':'#FFD700','border-color':'#FFA500','border-width':3,'shadow-blur':15,'shadow-color':'#FFA500','shadow-opacity':0.7,'z-index':20}},
                    {selector:'edge.traffic-path-edge',style:{'line-color':'#FFA500','target-arrow-color':'#FFA500','width':3.0,'opacity':1,'z-index':19}},
                    {selector:'.search-match',style:{'border-width':3,'shadow-blur':10,'shadow-opacity':0.6,'z-index':20,'opacity':1}},
                    {selector:'node.search-match',style:{'background-color':'#90EE90','border-color':'#32CD32','shadow-color':'#32CD32'}},
                    {selector:'edge.search-match',style:{'line-color':'#32CD32','target-arrow-color':'#32CD32','width':2.5,'opacity':1,'z-index':19}},
                    {selector:'.search-match-ancestor',style:{'background-opacity':0.5,'border-style':'dotted','border-color':'#007bff','opacity':0.7, 'z-index': 5 }},
                    {selector:'.dimmed',style:{'opacity':0.15}},
                    {selector:'edge.rule-issue',style:{'line-color':ele=>ele.data('issue_color')||'#800080','target-arrow-color':ele=>ele.data('issue_color')||'#800080','width':2.0,'line-style':ele=>ele.data('issue_line_style')||'solid','z-index':18}}
                ],
                layout:{name:'cose',animate:true,animationDuration:300,fit:true,padding:30,nodeRepulsion:node=>node.isParent()?(node.data('is_group_parent')?11e5:9e5):2e5,idealEdgeLength:edge=>edge.target().isParent()||edge.source().isParent()?190:100,edgeElasticity:edge=>edge.target().isParent()||edge.source().isParent()?170:90,nestingFactor:.1,gravity:30,numIter:1300,initialTemp:180,coolingFactor:.95,minTemp:1,nodeOverlap:15,componentSpacing:65}
            });
            cy.on('layoutstop',()=>{ /* No explicit style capture needed if relying on classes */ });
            cy.on('tap',evt=>{const t=evt.target;if(t===cy)handleGraphClick({nodes:[],edges:[]});else if(t.isNode())handleGraphClick({nodes:[t.id()],edges:[]});else if(t.isEdge())handleGraphClick({nodes:[],edges:[t.id()]});});
            displayNotification("Graph rendered with Cytoscape.js!","success");
        }catch(err){console.error("Error initializing Cytoscape.js:",err);displayNotification("Error initializing graph: "+err.message,'error',0);}
    }

    const infoPanel=document.getElementById('info-panel'),infoContent=document.getElementById('info-content'),closeInfoPanelBtn=document.getElementById('close-info-panel');
    if(closeInfoPanelBtn)closeInfoPanelBtn.addEventListener('click',hideInfoPanel);
    function hideInfoPanel(){if(infoPanel)infoPanel.classList.remove('visible');selectedElementForInfo=null;}
    function showInfoPanel(){if(infoPanel)infoPanel.classList.add('visible');}
    function formatObjectForInfoPanel(obj,fullJson){/* ... (as before) ... */let html=`<p><strong>ID:</strong> ${obj.id}</p><p><strong>Name:</strong> ${obj.name}</p><p><strong>Type:</strong> ${obj.type}</p><p><strong>Value:</strong> ${obj.value}</p>`;const z=fullJson.zones.find(zn=>zn.id===obj.zone);html+=`<p><strong>Zone:</strong> ${z?z.name:obj.zone}</p>`;let gMem=[];(fullJson.groups||[]).forEach(g=>{if((g.members||[]).includes(obj.id))gMem.push(g.name||g.id);});if(gMem.length>0)html+=`<p><strong>Member of Groups:</strong> ${gMem.join(', ')}</p>`;if(obj.tags?.length>0){html+="<p><strong>Tags:</strong></p><ul>";obj.tags.forEach(tId=>{const t=fullJson.tags.find(tg=>tg.id===tId);html+=`<li>${t?t.name:tId}${t?.color?` (<span style="color:${t.color};">●</span> ${t.color})`:''}</li>`;});html+="</ul>";}html+="<h4>Raw Data:</h4>"+`<pre>${JSON.stringify(obj,null,2)}</pre>`;return html;}
    function formatRuleForInfoPanel(rule,fullJson){/* ... (as before) ... */let html=`<p><strong>ID:</strong> ${rule.id}</p>`;if(rule.name)html+=`<p><strong>Name:</strong> ${rule.name}</p>`;html+=`<p><strong>Action:</strong> <span style="color:${rule.action==='allow'?'green':'red'};font-weight:bold;">${rule.action.toUpperCase()}</span></p><p><strong>Enabled:</strong> ${rule.enabled}</p>`;const fmtIds=(ids,map,prop='name')=>ids.map(id=>map.get(id)?.[prop]||id).join(', ');const oM=new Map(fullJson.objects.map(o=>[o.id,o])),gM=new Map(fullJson.groups.map(g=>[g.id,g])),zM=new Map(fullJson.zones.map(z=>[z.id,z]));html+=`<p><strong>Src Zones:</strong> ${fmtIds(rule.source_zone,zM)}</p><p><strong>Src Objs/Grps:</strong> ${fmtIds(rule.source_objects,new Map([...oM,...gM]))}</p>`;html+=`<p><strong>Dst Zones:</strong> ${fmtIds(rule.destination_zone,zM)}</p><p><strong>Dst Objs/Grps:</strong> ${fmtIds(rule.destination_objects,new Map([...oM,...gM]))}</p>`;html+="<p><strong>Services:</strong></p><ul>";rule.services.forEach(s=>{html+=`<li>${s.protocol}:${s.destination_port}</li>`;});html+="</ul>";if(rule.tags?.length>0){html+="<p><strong>Tags:</strong></p><ul>";rule.tags.forEach(tId=>{const t=fullJson.tags.find(tg=>tg.id===tId);html+=`<li>${t?t.name:tId}${t?.color?` (<span style="color:${t.color};">●</span> ${t.color})`:''}</li>`;});html+="</ul>";}if(rule.description)html+=`<p><strong>Description:</strong> ${rule.description}</p>`;html+="<h4>Raw Data:</h4>"+`<pre>${JSON.stringify(rule,null,2)}</pre>`;return html;}
    function handleGraphClick(params){/* ... (as before, with group parent info) ... */if(!currentJsonData||!cy)return;if(params.nodes.length>0){const nId=params.nodes[0],nEl=cy.getElementById(nId),nDataOrig=currentJsonData.objects.find(o=>o.id===nId);if(nDataOrig&&infoContent){infoContent.innerHTML=formatObjectForInfoPanel(nDataOrig,currentJsonData);showInfoPanel();selectedElementForInfo={type:'node',id:nId};}else if(nEl.data('is_zone_parent')&&infoContent){const zId=nEl.id().replace('zone-',''),zData=currentJsonData.zones.find(z=>z.id===zId);if(zData){let h=`<p><strong>ID:</strong> ${nEl.id()}</p><p><strong>Name:</strong> ${zData.name}</p><p><strong>Type:</strong> Zone</p>`;if(zData.description)h+=`<p><strong>Description:</strong> ${zData.description}</p>`;h+="<h4>Raw Data:</h4>"+`<pre>${JSON.stringify(zData,null,2)}</pre>`;infoContent.innerHTML=h;showInfoPanel();selectedElementForInfo={type:'zone_parent',id:nEl.id()};}}else if(nEl.data('is_group_parent')&&infoContent){const gId=nEl.id().replace('group-',''),gData=currentJsonData.groups.find(g=>g.id===gId);if(gData){let h=`<p><strong>ID:</strong> ${nEl.id()}</p><p><strong>Name:</strong> ${gData.name}</p><p><strong>Type:</strong> Group</p>`;const gTags=(gData.tags||[]).map(tId=>currentJsonData.tags.find(t=>t.id===tId)?.name).filter(n=>n);if(gTags.length>0)h+=`<p><strong>Tags:</strong> ${gTags.join(', ')}</p>`;h+=`<p><strong>Members (${(gData.members||[]).length}):</strong></p><ul>`;(gData.members||[]).forEach(mId=>{const mO=currentJsonData.objects.find(o=>o.id===mId);h+=`<li>${mO?mO.name:mId}</li>`;});h+="</ul><h4>Raw Data:</h4>"+`<pre>${JSON.stringify(gData,null,2)}</pre>`;infoContent.innerHTML=h;showInfoPanel();selectedElementForInfo={type:'group_parent',id:nEl.id()};}}}else if(params.edges.length>0){const visEId=params.edges[0],eEl=cy.getElementById(visEId),origRuleId=eEl.data('rule_id');const ruleObj=currentJsonData.rules.find(r=>r.id===origRuleId);if(ruleObj&&infoContent){infoContent.innerHTML=formatRuleForInfoPanel(ruleObj,currentJsonData);showInfoPanel();selectedElementForInfo={type:'edge',id:visEId,ruleId:origRuleId};}}else{hideInfoPanel();}}

    function ipToLong(ip){/*..*/let i=0;ip.split('.').forEach(o=>{i<<=8;i+=parseInt(o);});return i>>>0;}
    function isIpInCidr(ip,cidr){/*..*/try{const[r,bS="32"]=cidr.split('/');const b=parseInt(bS);if(isNaN(b)||b<0||b>32)return!1;if(b===32)return ip===r;const m=~((1<<(32-b))-1);return(ipToLong(ip)&m)===(ipToLong(r)&m);}catch(e){return!1;}}
    function ipRuleMatchesSimIp(val,sIp){/*..*/if(!sIp||!val)return!1;if(val.toLowerCase()==="any"||val==="0.0.0.0/0")return!0;if(val.includes('/'))return isIpInCidr(sIp,val);return val===sIp;}
    function getIpVals(ids,oM,gM){/*..*/const v=new Set();ids.forEach(id=>{if(gM.has(id))gM.get(id).members.forEach(mId=>{const o=oM.get(mId);if(o)v.add(o.value);});else{const o=oM.get(id);if(o)v.add(o.value);}});return Array.from(v);}
    function compIpSets(setA,setB){/*..*/const aAny=setA.some(i=>i==="0.0.0.0/0"||i.toLowerCase()==="any"),bAny=setB.some(i=>i==="0.0.0.0/0"||i.toLowerCase()==="any");if(aAny&&bAny)return"equal";if(aAny)return"superset";if(bAny)return"subset";const aS=new Set(setA),bS=new Set(setB),allAinB=setA.every(i=>bS.has(i)),allBinA=setB.every(i=>aS.has(i));if(allAinB&&allBinA&&aS.size===bS.size)return"equal";if(allAinB&&aS.size<bS.size)return"subset";if(allBinA&&bS.size<aS.size)return"superset";if(allAinB&&!allBinA)return"subset";if(!allBinA&&allBinA)return"superset";if(setA.some(i=>bS.has(i)))return"overlap";return"none";}
    function compSrvSets(srvA,srvB){/*..*/const n=s=>`${s.protocol.toUpperCase()}:${s.destination_port.toString().toUpperCase()}`,nA=new Set(srvA.map(n)),nB=new Set(srvB.map(n)),aAny=nA.has("ANY:ANY"),bAny=nB.has("ANY:ANY");if(aAny&&bAny)return"equal";if(aAny)return"superset";if(bAny)return"subset";const allAinB=Array.from(nA).every(s=>nB.has(s)),allBinA=Array.from(nB).every(s=>nA.has(s));if(allAinB&&allBinA&&nA.size===nB.size)return"equal";if(allAinB&&nA.size<nB.size)return"subset";if(allBinA&&nB.size<nA.size)return"superset";if(allAinB&&!allBinA)return"subset";if(!allBinA&&allBinA)return"superset";if(Array.from(nA).some(s=>nB.has(s)))return"overlap";return"none";}

    function clearAllHighlights(){if(!cy)return;cy.batch(()=>{cy.elements().removeClass('traffic-path-node traffic-path-edge search-match search-no-match rule-issue dimmed search-match-ancestor highlighted').removeData('issue_color issue_line_style issue_message tooltip_text_original');cy.edges().forEach(e=>{if(e.data('tooltip_text_original')){e.data('tooltip_text',e.data('tooltip_text_original'));e.removeData('tooltip_text_original');}});});hideInfoPanel();}
    document.getElementById('clear-simulation-btn')?.addEventListener('click',clearAllHighlights);
    document.getElementById('clear-search-btn')?.addEventListener('click',clearAllHighlights);

    function simulateTraffic(){
        if(!cy||!currentJsonData){displayNotification("Graph or data not loaded.","warning");return;}clearAllHighlights();
        const sIp=document.getElementById('sim-source-ip').value.trim(),dIp=document.getElementById('sim-dest-ip').value.trim(),sPortVal=document.getElementById('sim-dest-port').value,sProto=document.getElementById('sim-protocol').value.toUpperCase();
        if(!sIp||!dIp||!sPortVal||!sProto){displayNotification("Please fill all simulation fields.","warning");return;}const sPort=parseInt(sPortVal);if(isNaN(sPort)){displayNotification("Destination Port must be a number.","warning");return;}
        const oM=new Map(currentJsonData.objects.map(o=>[o.id,o])),gM=new Map(currentJsonData.groups.map(g=>[g.id,g])),matched={nodes:new Set(),edges:new Set()};
        currentJsonData.rules.forEach(r=>{if(!r.enabled)return;let pM=r.services.some(s=>sProto==="ANY"||s.protocol.toUpperCase()===sProto||s.protocol.toUpperCase()==="ANY");if(!pM)return;let portM=r.services.some(s=>{const rp=s.destination_port.toString().toUpperCase();return rp==="ANY"||parseInt(s.destination_port)===sPort;});if(!portM)return;let srcIpM=!1;const rSrcM=[];r.source_objects.forEach(sId=>{const mem=gM.has(sId)?gM.get(sId).members:[sId];mem.forEach(mId=>{const o=oM.get(mId);if(o&&ipRuleMatchesSimIp(o.value,sIp)){srcIpM=!0;rSrcM.push(mId);}});});if(!srcIpM)return;let destIpM=!1;const rDestM=[];r.destination_objects.forEach(dId=>{const mem=gM.has(dId)?gM.get(dId).members:[dId];mem.forEach(mId=>{const o=oM.get(mId);if(o&&ipRuleMatchesSimIp(o.value,dIp)){destIpM=!0;rDestM.push(mId);}});});if(!destIpM)return;
            if(pM&&portM&&srcIpM&&destIpM){rSrcM.forEach(id=>{const o=oM.get(id);if(o&&ipRuleMatchesSimIp(o.value,sIp))matched.nodes.add(id);});rDestM.forEach(id=>{const o=oM.get(id);if(o&&ipRuleMatchesSimIp(o.value,dIp))matched.nodes.add(id);});rSrcM.forEach(sId=>{if(oM.has(sId)&&ipRuleMatchesSimIp(oM.get(sId).value,sIp)){rDestM.forEach(dId=>{if(oM.has(dId)&&ipRuleMatchesSimIp(oM.get(dId).value,dIp)){const eId=`${r.id}-${sId}-${dId}`;if(cy.getElementById(eId).length>0)matched.edges.add(eId);}});}});}
        });
        if(matched.nodes.size===0&&matched.edges.size===0)displayNotification("No rules or paths matched the simulated traffic.","info");
        else{cy.batch(()=>{matched.nodes.forEach(nId=>cy.getElementById(nId).addClass('traffic-path-node'));matched.edges.forEach(eId=>cy.getElementById(eId).addClass('traffic-path-edge'));});displayNotification(`Simulation: Highlighted ${matched.nodes.size} nodes, ${matched.edges.size} edges.`,"success");}
    }
    document.getElementById('simulate-btn')?.addEventListener('click',simulateTraffic);

    function analyzeRules(){
        if(!cy||!currentJsonData){displayNotification("Graph or data not loaded.","warning");return;}clearAllHighlights(true);
        const rules=currentJsonData.rules.filter(r=>r.enabled),oM=new Map(currentJsonData.objects.map(o=>[o.id,o])),gM=new Map(currentJsonData.groups.map(g=>[g.id,g])),issues=[];
        for(let i=0;i<rules.length;i++){const rA=rules[i],srcA=getIpVals(rA.source_objects,oM,gM),dstA=getIpVals(rA.destination_objects,oM,gM);for(let j=i+1;j<rules.length;j++){const rB=rules[j],srcB=getIpVals(rB.source_objects,oM,gM),dstB=getIpVals(rB.destination_objects,oM,gM);const srcC=compIpSets(srcA,srcB),dstC=compIpSets(dstA,dstB),srvC=compSrvSets(rA.services,rB.services);const condEq=srcC==="equal"&&dstC==="equal"&&srvC==="equal",aSupEqB=(srcC==="superset"||srcC==="equal")&&(dstC==="superset"||dstC==="equal")&&(srvC==="superset"||srvC==="equal");if(condEq){if(rA.action!==rB.action)issues.push({rId:rB.id,rN:rB.name,type:"Conflict/Shadowed",cId:rA.id,cName:rA.name,msg:`Identical to preceding ${rA.id}(${rA.name||''}), different action. ${rB.id} shadowed.`});else issues.push({rId:rB.id,rN:rB.name,type:"Redundant",cId:rA.id,cName:rA.name,msg:`Redundant to preceding ${rA.id}(${rA.name||''}), same conditions/action.`});}else if(aSupEqB){if(rA.action!==rB.action)issues.push({rId:rB.id,rN:rB.name,type:"Shadowed",cId:rA.id,cName:rA.name,msg:`Shadowed by broader ${rA.id}(${rA.name||''}), different action.`});else issues.push({rId:rB.id,rN:rB.name,type:"Redundant",cId:rA.id,cName:rA.name,msg:`Redundant to broader ${rA.id}(${rA.name||''}), same action.`});}}}
        if(issues.length>0){cy.batch(()=>{issues.forEach(iss=>{const rBEles=cy.edges(`[rule_id="${iss.rId}"]`);let iCol='#800080',lStl='solid';if(iss.type==="Conflict/Shadowed"){iCol='#FF00FF';lStl='dotted';}if(iss.type==="Redundant")iCol='#FFA500';if(iss.type==="Shadowed"){iCol='#AAAAAA';lStl='dashed';}rBEles.forEach(e=>{e.addClass('rule-issue').data({issue_color:iCol,issue_line_style:lStl});const currTT=e.data('tooltip_text_original')||e.data('tooltip_text')||'';if(!e.data('tooltip_text_original'))e.data('tooltip_text_original',currTT);const issueMsgClean=iss.msg.replace(/"/g,"'");e.data('tooltip_text',`${currTT}<br><strong style='color:${iCol};'>Issue: ${iss.type}</strong> (vs ${iss.cId||'N/A'})<br>${issueMsgClean}`);});console.warn(`Rule Issue: ${iss.type} for ${iss.rId}(${iss.rN}) vs ${iss.cId}(${iss.cName}). Msg: ${iss.msg}`);});});displayNotification(`${issues.length} potential rule issue(s) found. Check console/tooltips.`,"warning",6000);}else displayNotification("No obvious rule issues found.","success");
    }
    document.getElementById('analyze-rules-btn')?.addEventListener('click',analyzeRules);

    function searchElements(){
        if(!cy||!currentJsonData){displayNotification("Graph or data not loaded.","warning");return;}clearAllHighlights(true);
        const term=document.getElementById('search-term').value.trim().toLowerCase();if(!term)return;
        const mNodeIds=new Set(),mEdgeIds=new Set(),oM=new Map(currentJsonData.objects.map(o=>[o.id,o])),tM=new Map(currentJsonData.tags.map(t=>[t.id,t])),gM=new Map(currentJsonData.groups.map(g=>[g.id,g])),zM=new Map(currentJsonData.zones.map(z=>[z.id,z])),mTagIds=new Set();
        currentJsonData.tags.forEach(t=>{if(t.id.toLowerCase().includes(term)||t.name.toLowerCase().includes(term)||(t.description&&t.description.toLowerCase().includes(term)))mTagIds.add(t.id);});
        currentJsonData.objects.forEach(o=>{let isM=!1;if(o.id.toLowerCase().includes(term)||o.name.toLowerCase().includes(term)||o.value.toLowerCase().includes(term))isM=!0;o.tags.forEach(tId=>{if(mTagIds.has(tId))isM=!0;const t=tM.get(tId);if(t&&t.name.toLowerCase().includes(term))isM=!0;});const z=zM.get(o.zone);if(z&&z.name.toLowerCase().includes(term))isM=!0;if(isM)mNodeIds.add(o.id);});
        currentJsonData.groups.forEach(g=>{let gIsM=!1;if(g.id.toLowerCase().includes(term)||g.name.toLowerCase().includes(term))gIsM=!0;g.tags.forEach(tId=>{if(mTagIds.has(tId))gIsM=!0;const t=tM.get(tId);if(t&&t.name.toLowerCase().includes(term))gIsM=!0;});if(gIsM){g.members.forEach(mId=>mNodeIds.add(mId));mNodeIds.add(`group-${g.id}`);}});
        currentJsonData.zones.forEach(z=>{if(z.id.toLowerCase().includes(term)||z.name.toLowerCase().includes(term))mNodeIds.add(`zone-${z.id}`);});
        currentJsonData.rules.forEach(r=>{if(!r.enabled)return;let rIsM=!1;if(r.id.toLowerCase().includes(term)||(r.name&&r.name.toLowerCase().includes(term))||(r.description&&r.description.toLowerCase().includes(term)))rIsM=!0;r.tags.forEach(tId=>{if(mTagIds.has(tId))rIsM=!0;const t=tM.get(tId);if(t&&t.name.toLowerCase().includes(term))rIsM=!0;});r.services.forEach(s=>{if(s.protocol.toLowerCase().includes(term)||s.destination_port.toString().toLowerCase().includes(term))rIsM=!0;});
            let rSrcIds=[],rDstIds=[];r.source_objects.forEach(sId=>{if(gM.has(sId))rSrcIds.push(...gM.get(sId).members);else rSrcIds.push(sId);});rSrcIds=[...new Set(rSrcIds)];r.destination_objects.forEach(dId=>{if(gM.has(dId))rDstIds.push(...gM.get(dId).members);else rDstIds.push(dId);});rDstIds=[...new Set(rDstIds)];
            let rRefsMNode=!1;rSrcIds.forEach(id=>{if(mNodeIds.has(id))rRefsMNode=!0;});rDstIds.forEach(id=>{if(mNodeIds.has(id))rRefsMNode=!0;});
            if(rIsM||rRefsMNode){rSrcIds.forEach(id=>mNodeIds.add(id));rDstIds.forEach(id=>mNodeIds.add(id));rSrcIds.forEach(sId=>{rDstIds.forEach(dId=>{if(oM.has(sId)&&oM.has(dId)){const vEId=`${r.id}-${sId}-${dId}`;if(cy.getElementById(vEId).length>0)mEdgeIds.add(vEId);}});});}});
        if(mNodeIds.size===0&&mEdgeIds.size===0&&term)displayNotification("No elements matched search: "+term,"info");
        else{cy.batch(()=>{cy.elements().addClass('dimmed');mNodeIds.forEach(id=>cy.getElementById(id).removeClass('dimmed').addClass('search-match'));mEdgeIds.forEach(id=>cy.getElementById(id).removeClass('dimmed').addClass('search-match'));let pToH=cy.collection();cy.nodes('.search-match').filter(n=>!n.isParent()).forEach(n=>{pToH=pToH.union(n.ancestors());});pToH.removeClass('dimmed').addClass('search-match-ancestor');});displayNotification(`Search: Found ${mNodeIds.size} nodes, ${mEdgeIds.size} edges for "${term}".`,"success");if(mNodeIds.size>0){const firstMatchId=mNodeIds.values().next().value;const firstMatchEle=cy.getElementById(firstMatchId);if(firstMatchEle.length&&!firstMatchEle.isParent()){cy.animate({fit:{eles:firstMatchEle,padding:100},duration:800});}}}
    }
    document.getElementById('search-btn')?.addEventListener('click',searchElements);
    const sTermIn=document.getElementById('search-term');if(sTermIn)sTermIn.addEventListener('keypress',e=>{if(e.key==='Enter'){e.preventDefault();searchElements();}});

    function exportJsonData(){/*..*/if(!currentJsonData){displayNotification("No data to export.","warning");return;}try{const jsonStr=JSON.stringify(currentJsonData,null,2),blob=new Blob([jsonStr],{type:"application/json"}),url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download="firewall_config_cy.json";document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);displayNotification("Data exported successfully!","success");}catch(err){console.error("Error exporting JSON:",err);displayNotification("Failed to export JSON.","error");}}
    function importJsonData(event){/*..*/const file=event.target.files[0];if(!file)return;if(file.type!=="application/json"){displayNotification("Please select a valid JSON file (.json).","warning");return;}const reader=new FileReader();reader.onload=function(e){try{const imported=JSON.parse(e.target.result);if(typeof imported!=='object'||imported===null||!Array.isArray(imported.objects)||!Array.isArray(imported.rules)||!Array.isArray(imported.zones)||!Array.isArray(imported.tags)||!Array.isArray(imported.groups)){displayNotification("Invalid JSON structure. Required fields missing or not arrays.","error",0);return;}currentJsonData=imported;clearAllHighlights(true);drawGraph(currentJsonData);displayNotification("JSON data imported. Redrawing graph.","success");}catch(err){console.error("Error importing JSON:",err);displayNotification("Failed to import JSON. Check format.","error",0);}finally{event.target.value=null;}};reader.readAsText(file);}
    document.getElementById('export-json-btn')?.addEventListener('click',exportJsonData);
    const impBtn=document.getElementById('import-json-btn'),impFileIn=document.getElementById('import-json-file');if(impBtn&&impFileIn){impBtn.addEventListener('click',()=>impFileIn.click());impFileIn.addEventListener('change',importJsonData);}

    fetch('data.json').then(r=>{if(!r.ok)throw new Error(`HTTP error ${r.status}`);return r.json();}).then(jsonData=>{currentJsonData=jsonData;drawGraph(currentJsonData);}).catch(e=>{console.error('Error loading initial data.json:',e);displayNotification('Failed to load default data.json. Try importing a file.','error',0);currentJsonData={objects:[],rules:[],zones:[],tags:[],groups:[]};drawGraph(currentJsonData);});
});
