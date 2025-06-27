document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('firewall-graph');
    let network = null;
    let originalNodesData = null;
    let originalEdgesData = null;
    let currentJsonData = null;
    let selectedElementForInfo = null;

    function lightenDarkenColor(col, amt) {
        if (!col) return '#CCCCCC';
        let usePound = false;
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

    function isColorDark(hexcolor){
        if (!hexcolor) return false;
        if (hexcolor.startsWith('#')) hexcolor = hexcolor.slice(1);
        if (hexcolor.length === 3) hexcolor = hexcolor.split('').map(char => char + char).join('');
        if (hexcolor.length !== 6) return false;
        const r = parseInt(hexcolor.substr(0,2),16), g = parseInt(hexcolor.substr(2,2),16), b = parseInt(hexcolor.substr(4,2),16);
        return (0.299*r + 0.587*g + 0.114*b)/255 < 0.5;
    }

    function transformData(data) {
        const nodes = new vis.DataSet(), edges = new vis.DataSet();
        const zoneMap = new Map(data.zones.map(z => [z.id, z])), tagMap = new Map(data.tags.map(t => [t.id, t])), groupMap = new Map(data.groups.map(g => [g.id, g]));
        data.objects.forEach(obj => {
            let lbl = `<b>${obj.name}</b>\n(${obj.value})`, tags = obj.tags.map(tId => tagMap.get(tId)?.name).filter(n=>n);
            if (tags.length > 0) lbl += `\n<i>[${tags.join(', ')}]</i>`;
            const zn = zoneMap.get(obj.zone), zClr = zn?.color || '#CCCCCC', zName = zn?.name || obj.zone;
            let bClr = lightenDarkenColor(zClr, -30), bW = 1.5;
            if (obj.tags.length > 0) { const fTag = tagMap.get(obj.tags[0]); if (fTag?.color) { bClr = fTag.color; bW = 2.5; }}
            nodes.add({ id: obj.id, label: lbl, title: `<b>${obj.name}</b><br>IP: ${obj.value}<br>Type: ${obj.type}<br>Zone: ${zName}<br>Tags: ${tags.join(', ') || 'None'}`, group: obj.zone, shape: 'box', margin: 10, color: { background: zClr, border: bClr, highlight: { background: lightenDarkenColor(zClr, 20), border: lightenDarkenColor(bClr, 20) }, hover: { background: lightenDarkenColor(zClr, 10), border: bClr }}, borderWidth: bW, font: { multi: 'html', size: 12, color: isColorDark(zClr) ? '#FFF' : '#333', strokeWidth: 0 }});
        });
        data.rules.forEach(rule => {
            if (!rule.enabled) return;
            let srcs = [], dests = [];
            rule.source_objects.forEach(sId => { if (groupMap.has(sId)) srcs.push(...groupMap.get(sId).members); else if (nodes.get(sId)) srcs.push(sId); }); srcs = [...new Set(srcs)];
            rule.destination_objects.forEach(dId => { if (groupMap.has(dId)) dests.push(...groupMap.get(dId).members); else if (nodes.get(dId)) dests.push(dId); }); dests = [...new Set(dests)];
            if (srcs.length === 0 || dests.length === 0) return;
            const rTags = rule.tags.map(tId => tagMap.get(tId)?.name).filter(n=>n), srvLbl = rule.services.map(s => `${s.protocol}:${s.destination_port}`).join(',\n');
            let eLbl = srvLbl; if (rTags.length > 0) eLbl += `\n<i>[${rTags.join(',')}]</i>`;
            const srcZn = [...new Set(rule.source_zone.map(zId => zoneMap.get(zId)?.name || zId))].join(', '), dstZn = [...new Set(rule.destination_zone.map(zId => zoneMap.get(zId)?.name || zId))].join(', ');
            let eTitle = `<b>Rule: ${rule.name||rule.id}</b><br>Action: ${rule.action.toUpperCase()}<br>Services: ${srvLbl.replace(/\n/g,', ')}<br>From: ${srcZn}<br>To: ${dstZn}<br>Tags: ${rTags.join(', ')||'None'}`;
            if(rule.description) eTitle += `<br>Desc: ${rule.description}`;
            let eClr = rule.action === 'allow' ? '#2ECC71' : '#E74C3C', dsh = rule.action === 'deny';
            srcs.forEach(sId => { dests.forEach(dId => { if (!nodes.get(sId) || !nodes.get(dId) || sId === dId) return; const eId = `${rule.id}-${sId}-${dId}`; edges.add({ id: eId, from: sId, to: dId, label: eLbl, title: eTitle, arrows: {to:{enabled:true,scaleFactor:0.8,type:'arrow'}}, color:{color:eClr,highlight:lightenDarkenColor(eClr,20),hover:lightenDarkenColor(eClr,10),opacity:0.85}, dashes:dsh, font:{multi:'html',size:10,color:'#555',strokeWidth:0,align:'middle'}, smooth:{enabled:true,type:"cubicBezier",forceDirection:"horizontal",roundness:0.2}});});});
        });
        return { nodes, edges };
    }

    function drawGraph(jsonData) {
        const visData = transformData(jsonData);
        const options = {
            physics: {enabled:true,solver:'barnesHut',barnesHut:{gravitationalConstant:-8000,centralGravity:0.1,springLength:180,springConstant:0.04,damping:0.15,avoidOverlap:0.35},stabilization:{iterations:1500,fit:true,updateInterval:20}},
            interaction:{hover:true,tooltipDelay:200,dragNodes:true,dragView:true,zoomView:true,navigationButtons:true,keyboard:true, selectConnectedEdges: false},
            nodes: { font: { strokeWidth: 1, strokeColor: '#ffffff'}},
            edges: { font: {align:'middle', size:9, strokeWidth:2, strokeColor:'rgba(255,255,255,0.7)', multi:'html', color:'#404040'}, smooth:{enabled:true,type:"cubicBezier",forceDirection:'horizontal',roundness:0.3}, hoverWidth: factor => factor + 0.5, selectionWidth: factor => factor + 0.8 },
            groups:{}
        };
        jsonData.zones.forEach(z => { const zc = z.color||'#DDD'; options.groups[z.id] = {shape:'box',font:{color:isColorDark(zc)?'#FFF':'#333',size:12,face:'Arial',multi:'html'},color:{background:zc,border:lightenDarkenColor(zc,-40)}};});

        if(container){
            if(network) network.destroy();
            network = new vis.Network(container,visData,options);
            network.on("stabilizationIterationsDone",()=>{
                if(network && (!originalNodesData || !originalEdgesData || originalNodesData.length === 0)){
                    originalNodesData = new vis.DataSet(network.body.data.nodes.get({returnType:"Array"}));
                    originalEdgesData = new vis.DataSet(network.body.data.edges.get({returnType:"Array"}));
                }
            });
            network.on("click", handleGraphClick);
            network.on("deselectNode", ()=>{ if(selectedElementForInfo?.type === 'node') hideInfoPanel();});
            network.on("deselectEdge", ()=>{ if(selectedElementForInfo?.type === 'edge') hideInfoPanel();});
        } else console.error('Graph container not found!');
    }

    const infoPanel = document.getElementById('info-panel');
    const infoContent = document.getElementById('info-content');
    const closeInfoPanelBtn = document.getElementById('close-info-panel');
    if(closeInfoPanelBtn) closeInfoPanelBtn.addEventListener('click', hideInfoPanel);

    function hideInfoPanel() { if(infoPanel)infoPanel.classList.remove('visible'); selectedElementForInfo = null; }
    function showInfoPanel() { if(infoPanel)infoPanel.classList.add('visible'); }

    function formatObjectForInfoPanel(obj, fullJson) {
        let html = `<p><strong>ID:</strong> ${obj.id}</p><p><strong>Name:</strong> ${obj.name}</p><p><strong>Type:</strong> ${obj.type}</p><p><strong>Value:</strong> ${obj.value}</p>`;
        const zone = fullJson.zones.find(z=>z.id===obj.zone); html += `<p><strong>Zone:</strong> ${zone?zone.name:obj.zone}</p>`;
        if(obj.tags?.length>0){html+="<p><strong>Tags:</strong></p><ul>";obj.tags.forEach(tId=>{const t=fullJson.tags.find(tg=>tg.id===tId);html+=`<li>${t?t.name:tId}${t?.color?` (<span style="color:${t.color};">●</span> ${t.color})`:''}</li>`;});html+="</ul>";}
        html += "<h4>Raw Data:</h4>" + `<pre>${JSON.stringify(obj,null,2)}</pre>`; return html;
    }
    function formatRuleForInfoPanel(rule, fullJson) {
        let html = `<p><strong>ID:</strong> ${rule.id}</p>`; if(rule.name)html+=`<p><strong>Name:</strong> ${rule.name}</p>`; html+=`<p><strong>Action:</strong> <span style="color:${rule.action==='allow'?'green':'red'};font-weight:bold;">${rule.action.toUpperCase()}</span></p><p><strong>Enabled:</strong> ${rule.enabled}</p>`;
        const fmtIds=(ids,map,prop='name')=>ids.map(id=>map.get(id)?.[prop]||id).join(', ');
        const oM=new Map(fullJson.objects.map(o=>[o.id,o])),gM=new Map(fullJson.groups.map(g=>[g.id,g])),zM=new Map(fullJson.zones.map(z=>[z.id,z]));
        html+=`<p><strong>Src Zones:</strong> ${fmtIds(rule.source_zone,zM)}</p><p><strong>Src Objs/Grps:</strong> ${fmtIds(rule.source_objects,new Map([...oM,...gM]))}</p>`;
        html+=`<p><strong>Dst Zones:</strong> ${fmtIds(rule.destination_zone,zM)}</p><p><strong>Dst Objs/Grps:</strong> ${fmtIds(rule.destination_objects,new Map([...oM,...gM]))}</p>`;
        html+="<p><strong>Services:</strong></p><ul>"; rule.services.forEach(s=>{html+=`<li>${s.protocol}:${s.destination_port}</li>`;}); html+="</ul>";
        if(rule.tags?.length>0){html+="<p><strong>Tags:</strong></p><ul>";rule.tags.forEach(tId=>{const t=fullJson.tags.find(tg=>tg.id===tId);html+=`<li>${t?t.name:tId}${t?.color?` (<span style="color:${t.color};">●</span> ${t.color})`:''}</li>`;});html+="</ul>";}
        if(rule.description)html+=`<p><strong>Description:</strong> ${rule.description}</p>`;
        html += "<h4>Raw Data:</h4>" + `<pre>${JSON.stringify(rule,null,2)}</pre>`; return html;
    }
    function handleGraphClick(params){
        if(!currentJsonData)return;
        if(params.nodes.length>0){const nId=params.nodes[0],nodeObj=currentJsonData.objects.find(o=>o.id===nId);if(nodeObj&&infoContent){infoContent.innerHTML=formatObjectForInfoPanel(nodeObj,currentJsonData);showInfoPanel();selectedElementForInfo={type:'node',id:nId};}}
        else if(params.edges.length>0){const visEId=params.edges[0],ruleIdParts=visEId.split('-'),origRuleId=ruleIdParts.slice(0,ruleIdParts.length-2).join('-'); const ruleObj=currentJsonData.rules.find(r=>r.id===origRuleId);if(ruleObj&&infoContent){infoContent.innerHTML=formatRuleForInfoPanel(ruleObj,currentJsonData);showInfoPanel();selectedElementForInfo={type:'edge',id:visEId,ruleId:origRuleId};}}
        else{hideInfoPanel();}
    }

    function ipToLong(ip) { let i=0; ip.split('.').forEach(o=>{i<<=8;i+=parseInt(o);}); return i>>>0; }
    function isIpInCidr(ip,cidr){try{const[r,bS="32"]=cidr.split('/');const b=parseInt(bS);if(isNaN(b)||b<0||b>32)return!1;if(b===32)return ip===r;const m=~((1<<(32-b))-1);return(ipToLong(ip)&m)===(ipToLong(r)&m);}catch(e){return!1;}}
    function ipRuleMatchesSimIp(val,sIp){if(!sIp||!val)return!1;if(val.toLowerCase()==="any"||val==="0.0.0.0/0")return!0;if(val.includes('/'))return isIpInCidr(sIp,val);return val===sIp;}

    function clearAllHighlights(keepOriginals = false) {
        if (!network) return;
        if (!originalNodesData || !originalEdgesData || originalNodesData.length === 0) {
            if (!keepOriginals) {
                 originalNodesData = new vis.DataSet(network.body.data.nodes.get({ returnType: "Array" }));
                 originalEdgesData = new vis.DataSet(network.body.data.edges.get({ returnType: "Array" }));
            }
        }
        if (originalNodesData && originalEdgesData && originalNodesData.length > 0) {
            network.body.data.nodes.update(originalNodesData.get({ returnType: "Array" }));
            network.body.data.edges.update(originalEdgesData.get({ returnType: "Array" }));
        }
        hideInfoPanel(); // Also hide info panel when clearing highlights
    }
    document.getElementById('clear-simulation-btn').addEventListener('click', () => clearAllHighlights());
    document.getElementById('clear-search-btn').addEventListener('click', () => clearAllHighlights());

    function simulateTraffic() { /* ... existing minified simulateTraffic ... */
        if(!network||!currentJsonData){alert("Graph/data not loaded.");return;}
        clearAllHighlights();
        if(!originalNodesData||!originalEdgesData || originalNodesData.length === 0){originalNodesData=new vis.DataSet(network.body.data.nodes.get({returnType:"Array"}));originalEdgesData=new vis.DataSet(network.body.data.edges.get({returnType:"Array"}));if(!originalNodesData.length&&!originalEdgesData.length){console.error("Failed to capture graph data.");return;}}
        const sIp=document.getElementById('sim-source-ip').value.trim(),dIp=document.getElementById('sim-dest-ip').value.trim(),sPortVal=document.getElementById('sim-dest-port').value,sProto=document.getElementById('sim-protocol').value.toUpperCase();
        if(!sIp||!dIp||!sPortVal||!sProto){alert("Please fill all simulation fields.");return;}
        const sPort=parseInt(sPortVal);if(isNaN(sPort)){alert("Port must be a number.");return;}
        const oMap=new Map(currentJsonData.objects.map(o=>[o.id,o])),gMap=new Map(currentJsonData.groups.map(g=>[g.id,g])),mRuleDet=[];
        currentJsonData.rules.forEach(r=>{if(!r.enabled)return;
            let pM=r.services.some(s=>sProto==="ANY"||s.protocol.toUpperCase()===sProto||s.protocol.toUpperCase()==="ANY");if(!pM)return;
            let portM=r.services.some(s=>{const rp=s.destination_port.toString().toUpperCase();return rp==="ANY"||parseInt(s.destination_port)===sPort;});if(!portM)return;
            let srcIpM=!1;const rSrcM=[];r.source_objects.forEach(sId=>{const mem=gMap.has(sId)?gMap.get(sId).members:[sId];mem.forEach(mId=>{const o=oMap.get(mId);if(o&&ipRuleMatchesSimIp(o.value,sIp)){srcIpM=!0;rSrcM.push(mId);}});});if(!srcIpM)return;
            let destIpM=!1;const rDestM=[];r.destination_objects.forEach(dId=>{const mem=gMap.has(dId)?gMap.get(dId).members:[dId];mem.forEach(mId=>{const o=oMap.get(mId);if(o&&ipRuleMatchesSimIp(o.value,dIp)){destIpM=!0;rDestM.push(mId);}});});if(!destIpM)return;
            if(pM&&portM&&srcIpM&&destIpM)mRuleDet.push({rId:r.id,srcM:[...new Set(rSrcM)],destM:[...new Set(rDestM)]});
        });
        const nUpd=new vis.DataSet(),eUpd=new vis.DataSet(),hNodeIds=new Set();
        mRuleDet.forEach(d=>{
            d.srcM.forEach(sId=>{if(!hNodeIds.has(sId)){const oN=originalNodesData.get(sId);if(oN)nUpd.add({id:sId,color:{...oN.color,border:'#FF3300'},borderWidth:(oN.borderWidth||1.5)+1.5,shadow:{enabled:!0,color:'rgba(255,51,0,0.6)',size:15,x:0,y:0}});hNodeIds.add(sId);}});
            d.destM.forEach(dId=>{if(!hNodeIds.has(dId)){const oN=originalNodesData.get(dId);if(oN)nUpd.add({id:dId,color:{...oN.color,border:'#FF3300'},borderWidth:(oN.borderWidth||1.5)+1.5,shadow:{enabled:!0,color:'rgba(255,51,0,0.6)',size:15,x:0,y:0}});hNodeIds.add(dId);}});
            d.srcM.forEach(sId=>{d.destM.forEach(dId=>{const vEId=`${d.rId}-${sId}-${dId}`,oE=originalEdgesData.get(vEId);if(oE)eUpd.add({id:vEId,width:(oE.width||1.5)+2,color:{...oE.color,color:'#FF8000',opacity:1},shadow:{enabled:!0,color:'rgba(255,128,0,0.6)',size:12,x:0,y:0}});});});
        });
        if(nUpd.length>0)network.body.data.nodes.update(nUpd.get({returnType:"Array"}));if(eUpd.length>0)network.body.data.edges.update(eUpd.get({returnType:"Array"}));
        if(mRuleDet.length===0)alert("No rules matched simulated traffic.");
    }
    document.getElementById('simulate-btn').addEventListener('click', simulateTraffic);

    function getIpVals(ids,oM,gM){const v=new Set();ids.forEach(id=>{if(gM.has(id))gM.get(id).members.forEach(mId=>{const o=oM.get(mId);if(o)v.add(o.value);});else{const o=oM.get(id);if(o)v.add(o.value);}});return Array.from(v);}
    function compIpSets(setA,setB){const aAny=setA.some(i=>i==="0.0.0.0/0"||i.toLowerCase()==="any"),bAny=setB.some(i=>i==="0.0.0.0/0"||i.toLowerCase()==="any");if(aAny&&bAny)return"equal";if(aAny)return"superset";if(bAny)return"subset";const aS=new Set(setA),bS=new Set(setB),allAinB=setA.every(i=>bS.has(i)),allBinA=setB.every(i=>aS.has(i));if(allAinB&&allBinA&&aS.size===bS.size)return"equal";if(allAinB&&aS.size<bS.size)return"subset";if(allBinA&&bS.size<aS.size)return"superset";if(allAinB&&!allBinA)return"subset";if(!allAinB&&allBinA)return"superset";if(setA.some(i=>bS.has(i)))return"overlap";return"none";}
    function compSrvSets(srvA,srvB){const n=s=>`${s.protocol.toUpperCase()}:${s.destination_port.toString().toUpperCase()}`,nA=new Set(srvA.map(n)),nB=new Set(srvB.map(n)),aAny=nA.has("ANY:ANY"),bAny=nB.has("ANY:ANY");if(aAny&&bAny)return"equal";if(aAny)return"superset";if(bAny)return"subset";const allAinB=Array.from(nA).every(s=>nB.has(s)),allBinA=Array.from(nB).every(s=>nA.has(s));if(allAinB&&allBinA&&nA.size===nB.size)return"equal";if(allAinB&&nA.size<nB.size)return"subset";if(allBinA&&nB.size<nA.size)return"superset";if(allAinB&&!allBinA)return"subset";if(!allAinB&&allBinA)return"superset";if(Array.from(nA).some(s=>nB.has(s)))return"overlap";return"none";}

    function analyzeRules() { /* ... existing minified analyzeRules ... */
        if(!currentJsonData||!network) { alert("Data or graph not ready for analysis."); return; }
        clearAllHighlights(true);
        if(!originalNodesData||!originalEdgesData || originalNodesData.length === 0){
            console.warn("Original data for analysis reset not available. Capturing current state.");
            originalNodesData=new vis.DataSet(network.body.data.nodes.get({returnType:"Array"}));
            originalEdgesData=new vis.DataSet(network.body.data.edges.get({returnType:"Array"}));
            if(!originalNodesData||originalNodesData.length===0){alert("Failed to get graph data for analysis.");return;}
        } else {
            network.body.data.nodes.update(originalNodesData.get({returnType:"Array"}));
            network.body.data.edges.update(originalEdgesData.get({returnType:"Array"}));
        }
        const rules=currentJsonData.rules.filter(r=>r.enabled),oM=new Map(currentJsonData.objects.map(o=>[o.id,o])),gM=new Map(currentJsonData.groups.map(g=>[g.id,g])),issues=[];
        for(let i=0;i<rules.length;i++){const rA=rules[i],srcA=getIpVals(rA.source_objects,oM,gM),dstA=getIpVals(rA.destination_objects,oM,gM);
            for(let j=i+1;j<rules.length;j++){const rB=rules[j],srcB=getIpVals(rB.source_objects,oM,gM),dstB=getIpVals(rB.destination_objects,oM,gM);
                const srcC=compIpSets(srcA,srcB),dstC=compIpSets(dstA,dstB),srvC=compSrvSets(rA.services,rB.services);
                const condEq=srcC==="equal"&&dstC==="equal"&&srvC==="equal",aSupEqB=(srcC==="superset"||srcC==="equal")&&(dstC==="superset"||dstC==="equal")&&(srvC==="superset"||srvC==="equal");
                if(condEq){if(rA.action!==rB.action)issues.push({rId:rB.id,rN:rB.name,type:"Conflict/Shadowed",cId:rA.id,msg:`Identical to preceding ${rA.id}(${rA.name||''}), different action. ${rB.id} shadowed.`});else issues.push({rId:rB.id,rN:rB.name,type:"Redundant",cId:rA.id,msg:`Redundant to preceding ${rA.id}(${rA.name||''}), same conditions/action.`});
                }else if(aSupEqB){if(rA.action!==rB.action)issues.push({rId:rB.id,rN:rB.name,type:"Shadowed",cId:rA.id,msg:`Shadowed by broader ${rA.id}(${rA.name||''}), different action.`});else issues.push({rId:rB.id,rN:rB.name,type:"Redundant",cId:rA.id,msg:`Redundant to broader ${rA.id}(${rA.name||''}), same action.`});}}}
        const eUpd=new vis.DataSet();
        issues.forEach(iss=>{console.warn(`Rule Issue: ${iss.type} for ${iss.rId}(${iss.rN}) vs ${iss.cId}. Msg: ${iss.msg}`);
            const rEdges=network.body.data.edges.get({filter:it=>it.id.startsWith(iss.rId+"-")});
            rEdges.forEach(e=>{let iCol='#800080';if(iss.type==="Conflict/Shadowed")iCol='#FF00FF';if(iss.type==="Redundant")iCol='#FFA500';if(iss.type==="Shadowed")iCol='#909090';
                const oE=originalEdgesData.get(e.id),newTitle=(oE?.title||`Edge ${e.id}`)+`<br><strong style='color:${iCol};'>Issue: ${iss.type}</strong> (vs ${iss.cId||'N/A'})`;
                eUpd.add({id:e.id,color:{...(oE?.color||{}),color:iCol},width:(oE?.width||1.5)+1,font:{...(oE?.font||{}),background:lightenDarkenColor(iCol,80)},title:newTitle,dashes:iss.type==="Shadowed"?[5,5]:(oE?.dashes||!1)});});});
        if(eUpd.length>0)network.body.data.edges.update(eUpd.get({returnType:"Array"}));
        if(issues.length>0)alert(`${issues.length} potential rule issue(s) found. Check console/tooltips.`);else alert("No obvious rule issues found (simplified logic).");
    }
    document.getElementById('analyze-rules-btn').addEventListener('click', analyzeRules);

    function searchElements() { /* ... existing minified searchElements, now with focus logic added ... */
        if(!network||!currentJsonData){alert("Graph/data not loaded.");return;}
        clearAllHighlights(true);
         if(!originalNodesData||!originalEdgesData || originalNodesData.length === 0){
            console.warn("Original data for search reset not available. Capturing current state.");
            originalNodesData=new vis.DataSet(network.body.data.nodes.get({returnType:"Array"}));
            originalEdgesData=new vis.DataSet(network.body.data.edges.get({returnType:"Array"}));
            if(!originalNodesData||originalNodesData.length===0){alert("Failed to get graph data for search.");return;}
        } else {
             network.body.data.nodes.update(originalNodesData.get({returnType:"Array"}));
             network.body.data.edges.update(originalEdgesData.get({returnType:"Array"}));
        }
        const term=document.getElementById('search-term').value.trim().toLowerCase();if(!term){/*alert("Please enter search term.");*/ return;} // Silently return if no term
        const mNodeIds=new Set(),mEdgeIds=new Set(),oM=new Map(currentJsonData.objects.map(o=>[o.id,o])),tM=new Map(currentJsonData.tags.map(t=>[t.id,t])),gM=new Map(currentJsonData.groups.map(g=>[g.id,g])),zM=new Map(currentJsonData.zones.map(z=>[z.id,z])),mTagIds=new Set();
        currentJsonData.tags.forEach(t=>{if(t.id.toLowerCase().includes(term)||t.name.toLowerCase().includes(term)||(t.description&&t.description.toLowerCase().includes(term)))mTagIds.add(t.id);});
        currentJsonData.objects.forEach(o=>{let isM=!1;if(o.id.toLowerCase().includes(term)||o.name.toLowerCase().includes(term)||o.value.toLowerCase().includes(term))isM=!0;o.tags.forEach(tId=>{if(mTagIds.has(tId))isM=!0;const t=tM.get(tId);if(t&&t.name.toLowerCase().includes(term))isM=!0;});const z=zM.get(o.zone);if(z&&z.name.toLowerCase().includes(term))isM=!0;if(isM)mNodeIds.add(o.id);});
        currentJsonData.groups.forEach(g=>{let groupIsM=!1;if(g.id.toLowerCase().includes(term)||g.name.toLowerCase().includes(term))groupIsM=!0;g.tags.forEach(tId=>{if(mTagIds.has(tId))groupIsM=!0;const t=tM.get(tId);if(t&&t.name.toLowerCase().includes(term))groupIsM=!0;});if(groupIsM)g.members.forEach(mId=>mNodeIds.add(mId));});
        currentJsonData.rules.forEach(r=>{if(!r.enabled)return;let rIsM=!1;if(r.id.toLowerCase().includes(term)||(r.name&&r.name.toLowerCase().includes(term))||(r.description&&r.description.toLowerCase().includes(term)))rIsM=!0;r.tags.forEach(tId=>{if(mTagIds.has(tId))rIsM=!0;const t=tM.get(tId);if(t&&t.name.toLowerCase().includes(term))rIsM=!0;});r.services.forEach(s=>{if(s.protocol.toLowerCase().includes(term)||s.destination_port.toString().toLowerCase().includes(term))rIsM=!0;});
            let rSrcIds=[],rDstIds=[];r.source_objects.forEach(sId=>{if(gM.has(sId))rSrcIds.push(...gM.get(sId).members);else rSrcIds.push(sId);});rSrcIds=[...new Set(rSrcIds)];
            r.destination_objects.forEach(dId=>{if(gM.has(dId))rDstIds.push(...gM.get(dId).members);else rDstIds.push(dId);});rDstIds=[...new Set(rDstIds)];
            let rRefsMNode=!1;rSrcIds.forEach(id=>{if(mNodeIds.has(id))rRefsMNode=!0;});rDstIds.forEach(id=>{if(mNodeIds.has(id))rRefsMNode=!0;});
            if(rIsM||rRefsMNode){rSrcIds.forEach(id=>mNodeIds.add(id));rDstIds.forEach(id=>mNodeIds.add(id));rSrcIds.forEach(sId=>{rDstIds.forEach(dId=>{if(oM.has(sId)&&oM.has(dId)){const vEId=`${r.id}-${sId}-${dId}`;if(network.body.data.edges.get(vEId))mEdgeIds.add(vEId);}});});}});

        const nUpd=[],allNodeIds=network.body.data.nodes.getIds();
        allNodeIds.forEach(nId=>{const oN=originalNodesData.get(nId);if(oN){if(mNodeIds.has(nId))nUpd.push({id:nId,color:{...oN.color,background:lightenDarkenColor(oN.color?.background||'#FFFF00',-25),border:'#0F0'},borderWidth:(oN.borderWidth||1.5)+1.5,font:{...oN.font,color:isColorDark(lightenDarkenColor(oN.color?.background||'#FFFF00',-25))?'#FFF':'#000'},shadow:{enabled:!0,color:'rgba(0,255,0,0.5)',size:15,x:0,y:0}});
            else nUpd.push({id:nId,color:{background:lightenDarkenColor(oN.color?.background||'#CCC',40),border:lightenDarkenColor(oN.color?.border||'#AAA',40)},font:{...oN.font,color:'#A0A0A0'},shadow:{enabled:!1}});}});
        if(nUpd.length>0)network.body.data.nodes.update(nUpd);
        const eUpd=[],allEdgeIds=network.body.data.edges.getIds();
        allEdgeIds.forEach(eId=>{const oE=originalEdgesData.get(eId);if(oE){if(mEdgeIds.has(eId))eUpd.push({id:eId,width:(oE.width||1.5)+1,color:{...oE.color,color:'#0AF',opacity:1},font:{...oE.font,color:'#07B'},shadow:{enabled:!0,color:'rgba(0,170,255,0.5)',size:10,x:0,y:0}});
            else eUpd.push({id:eId,width:oE.width||1.5,color:{...oE.color,color:lightenDarkenColor(oE.color?.color||'#888',50),opacity:0.2},font:{...oE.font,color:'#B0B0B0'},shadow:{enabled:!1}});}});
        if(eUpd.length>0)network.body.data.edges.update(eUpd);
        if(mNodeIds.size===0&&mEdgeIds.size===0 && term)alert("No elements matched search term."); // Only alert if term was entered
        else if(network && mNodeIds.size > 0){ const firstMatchedNode = mNodeIds.values().next().value; if(firstMatchedNode) network.focus(firstMatchedNode, {scale:1.3, animation:{duration:800, easingFunction:'easeInOutQuad'}});}
    }
    document.getElementById('search-btn').addEventListener('click', searchElements);
    const sTermIn = document.getElementById('search-term');
    if(sTermIn)sTermIn.addEventListener('keypress', e=>{if(e.key==='Enter'){e.preventDefault();searchElements();}});

    function exportJsonData() { /* ... existing minified exportJsonData ... */
        if (!currentJsonData) { alert("No data to export."); return; }
        try {
            const jsonStr = JSON.stringify(currentJsonData, null, 2);
            const blob = new Blob([jsonStr], {type:"application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = "firewall_topology_data.json";
            document.body.appendChild(a); a.click();
            document.body.removeChild(a); URL.revokeObjectURL(url);
        } catch (err) { console.error("Error exporting JSON:", err); alert("Failed to export JSON.");}
    }
    function importJsonData(event) { /* ... existing minified importJsonData ... */
        const file = event.target.files[0]; if (!file) return;
        if (file.type !== "application/json") { alert("Please select a valid JSON file (.json)."); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const imported = JSON.parse(e.target.result);
                if (typeof imported!=='object'||imported===null||!Array.isArray(imported.objects)||!Array.isArray(imported.rules)||!Array.isArray(imported.zones)||!Array.isArray(imported.tags)||!Array.isArray(imported.groups)) {
                    alert("Invalid JSON structure. Required fields missing or not arrays: objects, rules, zones, tags, groups."); return;
                }
                currentJsonData = imported;
                clearAllHighlights(true);
                originalNodesData = null;
                originalEdgesData = null;
                drawGraph(currentJsonData);
                alert("JSON data imported successfully!");
            } catch (err) { console.error("Error importing JSON:", err); alert("Failed to import JSON. Check format."); }
            finally { event.target.value = null; }
        };
        reader.readAsText(file);
    }
    document.getElementById('export-json-btn').addEventListener('click', exportJsonData);
    const importBtn = document.getElementById('import-json-btn'), importFileIn = document.getElementById('import-json-file');
    if(importBtn && importFileIn){ importBtn.addEventListener('click', () => importFileIn.click()); importFileIn.addEventListener('change', importJsonData); }

    fetch('data.json')
        .then(r => { if(!r.ok) throw new Error(`HTTP error ${r.status} fetching default data.json`); return r.json();})
        .then(jsonData => { currentJsonData = jsonData; drawGraph(currentJsonData); })
        .catch(e => { console.error('Error loading initial data.json:', e); alert('Failed to load initial data.json. Visualizer may not function correctly. Try importing a JSON file.'); currentJsonData = {objects:[],rules:[],zones:[],tags:[],groups:[]}; drawGraph(currentJsonData); });
});
