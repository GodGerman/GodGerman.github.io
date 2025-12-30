
const IP_LENGTH = 32;
dataInput = document.getElementById("data-input");
let ipInput = document.getElementById("ip");
let prefixInput = document.getElementById("prefix");
numHostInput = document.getElementById("num-host");
let numSubnetInput = document.getElementById("num-subnets");
resultsContent = document.getElementById("results-content");
let currentPage = 1;
let pagMargin = 0;
let numPages;
let reportGenerated = false;

ipRegEx = /^[^0]*([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])(\.([0-9]|[1-9][0-9]|1[0-9][0-9]|2[0-4][0-9]|25[0-5])){3}$/;

try {

    let vlsmIpInput = document.getElementById("vlsm-ip");
    let vlsmPrefixInput = document.getElementById("vlsm-prefix");
    let vlsmNumSubnetInput = document.getElementById("vlsm-num-subnets");

    vlsmIpInput.addEventListener("input", function () {

        if (ipRegEx.test(this.value)){

            let prefix = Number(getDefaultPrefix(getIpClass(this.value)));

            document.getElementById("prefix-label").style.transform = "translateY(-14px) scale(0.8)";
            document.getElementById("num-subnet-helper").innerText = "Rango (1 - " + new IpAddress(this.value, prefix).availabelSubnets + ")";
            vlsmPrefixInput.value = prefix;
            vlsmNumSubnetInput.setAttribute("max", new IpAddress(this.value, prefix).availabelSubnets);
            vlsmPrefixInput.removeAttribute("disabled");
            vlsmNumSubnetInput.removeAttribute("disabled");

            ipInput = this;
            prefixInput = vlsmPrefixInput;

        } else {

            document.getElementById("prefix-label").style.transform = "translateY(12px)";
            document.getElementById("num-subnet-helper").innerText = "";
            vlsmPrefixInput.value = "";
            vlsmPrefixInput.setAttribute("disabled", null);
            vlsmNumSubnetInput.setAttribute("disabled", null);

        }

    });

    vlsmPrefixInput.addEventListener("input", function () {

        document.getElementById("num-subnet-helper").innerText = "Rango (1 - " + new IpAddress(vlsmIpInput.value, Number(this.value)).availabelSubnets + ")";
        vlsmNumSubnetInput.setAttribute("max", new IpAddress(vlsmIpInput.value, Number(this.value)).availabelSubnets);

        prefixInput = this;

    });

    vlsmNumSubnetInput.addEventListener("input", function () {

        numSubnetInput = this;

        let numHostTbody = document.getElementById("num-hosts-tbody");
        let numSubnets = Number(this.value);

        document.getElementById("num-host-table-loader").classList.remove("hide");
        document.getElementById("num-host-table").classList.add("hide");

        numHostTbody.innerHTML = "";

        let i = 0;

        do {

            let tableRow = document.createElement("tr");
            let tableCell = document.createElement("td");
            let tableCell2 = document.createElement("td");
            let tableInputCell = document.createElement("input");

            tableInputCell.setAttribute("type", "number");
            tableInputCell.setAttribute("min", "1");
            tableInputCell.setAttribute("placeholder", "Introduce el Nº de hosts de la subred " + (i + 1));
            tableInputCell.setAttribute("required", null);
            tableInputCell.classList.add("validate", "num-host-by-net");
            tableInputCell.style.color = "#f7f7f7";

            tableCell.innerText = "Subred " + (i + 1);
            tableRow.appendChild(tableCell);

            tableCell2.appendChild(tableInputCell);
            tableRow.appendChild(tableCell2);

            numHostTbody.appendChild(tableRow);

            i++;

        } while (i < numSubnets);

        let inputs = document.getElementsByClassName("num-host-by-net");

        for (let i = 0; i < inputs.length; i++){

            inputs[i].addEventListener("input", function () {

                inputs[inputs.length - 1].setCustomValidity("");

            });

        }

        setTimeout(function () {

            document.getElementById("num-host-table-loader").classList.add("hide");
            document.getElementById("num-host-table").classList.remove("hide");

        }, 500);

    });

} catch (e) {

    //alert(e);

}


/******************************************* VALIDACIONES DE ENTRADA FLSM *********************************************/
try {

    ipInput.addEventListener("input", function () {

        if (ipRegEx.test(ipInput.value)){

            document.getElementById("prefix-label").style.transform = "translateY(-14px) scale(0.8)";
            prefixInput.value = Number(getDefaultPrefix(getIpClass(ipInput.value)));
            prefixInput.removeAttribute("disabled");
            numHostInput.removeAttribute("disabled");
            numSubnetInput.removeAttribute("disabled");

        } else {

            document.getElementById("prefix-label").style.transform = "translateY(12px)";
            prefixInput.value = "";
            prefixInput.setAttribute("disabled", null);
            numHostInput.setAttribute("disabled", null);
            numSubnetInput.setAttribute("disabled", null);
        }

    });

    numHostInput.addEventListener("input", function () {

        let numSubnet;
        let prefix = prefixInput.value;

        if (prefix === "") numSubnet = getNumSubnets(getDefaultPrefix(getIpClass(ipInput.value)), numHostInput.value);
        else numSubnet = getNumSubnets(prefix, numHostInput.value);

        document.getElementById("num-subnet-label").style.transform = "translateY(-14px) scale(0.8)";
        numSubnetInput.value = numSubnet;

        if (this.value === "") document.getElementById("num-host-label").style.transform = "translateY(12px)";
        else document.getElementById("num-host-label").style.transform = "translateY(-14px) scale(0.8)";

    });

    numSubnetInput.addEventListener("input", function () {

        let numHost;
        let prefix = prefixInput.value;

        if (prefix === "") numHost = getNumHosts(getDefaultPrefix(getIpClass(ipInput.value)), this.value);
        else numHost = getNumHosts(prefix, this.value);

        document.getElementById("num-host-label").style.transform = "translateY(-14px) scale(0.8)";
        numHostInput.value = numHost;

        if (this.value === "") document.getElementById("num-subnet-label").style.transform = "translateY(12px)";
        else document.getElementById("num-subnet-label").style.transform = "translateY(-14px) scale(0.8)";

    });

} catch (e) {

    // alert("Error try 1: " + e.detail);

}

try {

    dataInput.addEventListener("submit", function (e) {

        e.preventDefault();

        let ip = new IpAddress(ipInput.value, prefixInput.value);
        let results = [];
        let hostBySubnet = [];
        let numHosts = 0;

        document.getElementById("results-loader").classList.remove("hide");

        if (this.classList.contains("vlsm")){

            let inputs = document.getElementsByClassName("num-host-by-net");

            for (let i = 0; i < inputs.length; i++){

                hostBySubnet[i] = Number(inputs[i].value);
                numHosts += hostBySubnet[i];

            }

            document.getElementById("btn-explain").addEventListener("click", function (e) {

                e.preventDefault();

                let data = [ipToString(ip.address), ip.prefix].concat(hostBySubnet);

                document.cookie = "data=" + encodeURIComponent(data.toString());

                window.open("subredes-vlsm-paso-a-paso.html#ip", "_blank");

            });

            hostBySubnet.sort(function (a, b) { // ordenar las subredes de mayor a menor número de hosts
                return b - a;
            });

            let totalHosts = 0;

            for (let i = 0; i < hostBySubnet.length; i++) totalHosts += hostBySubnet[i];

            if (totalHosts > ip.availabelHosts){

                inputs[inputs.length - 1].setCustomValidity("La dirección IP proporcionada no pude direccionar a " + totalHosts + " hosts");
                document.getElementById("results-loader").classList.add("hide");
                this.reportValidity();
                return false;

            }

            results = ip.vlsmCalc(hostBySubnet);

            fillResultsTable(results);


        } else if (this.classList.contains("flsm")) {

            document.getElementById("btn-explain").addEventListener("click", function (e) {

                e.preventDefault();

                let data = ["flsm", ipToString(ip.address), ip.prefix, numSubnetInput.value];

                document.cookie = "data=" + encodeURIComponent(data.toString());

                //window.location.assign("subredes-flsm-paso-a-paso.html#explicacion");
                window.open("subredes-flsm-paso-a-paso.html#explicacion", "_blank");

                /*let a = document.createElement("a");
                a.target = "_blank";
                a.href = "subredes-flsm-paso-a-paso.html#explicacion";
                a.click();*/

            });

            results = ip.flsmCalc(numSubnetInput.value);

            fillResultsTable(results);

        } else {

            document.getElementById("btn-explain").addEventListener("click", function (e) {

                e.preventDefault();

                let data = ["flsm", ipToString(ip.address), ip.prefix, 0];

                // alert("hola");

                document.cookie = "data=" + encodeURIComponent(data.toString());

                window.location.assign("direccion-IP.html");

            });

            document.getElementsByClassName("req-ip")[0].innerHTML = ipToString(ip.address) + " /" + ip.prefix;
            document.getElementsByClassName("req-ip")[1].innerHTML = ipToString(ip.address);
            document.getElementById("mask").innerText = ipToString(ip.mask);
            document.getElementById("mask-bin").innerText = ipBinToString(ip.maskBin);
            document.getElementById("wildcard").innerText = ipToString(ip.wildcard);
            document.getElementById("wildcard-bin").innerText = ipBinToString(ip.wildcardBin);
            document.getElementById("req-ip-bin").innerText = ipBinToString(ip.addressBin);
            document.getElementById("net-address").innerText = ipToString(ip.netAddress);
            document.getElementById("net-address-bin").innerText = ipBinToString(ip.netAddressBin);
            document.getElementById("host-address").innerText = ipToString(ip.hostAddress);
            document.getElementById("host-address-bin").innerText = ipBinToString(ip.hostAddressBin);
            document.getElementById("first-host").innerText = ipToString(ip.firstHost);
            document.getElementById("first-host-bin").innerText = ipBinToString(ip.firstHostBin);
            document.getElementById("last-host").innerText = ipToString(ip.lastHost);
            document.getElementById("last-host-bin").innerText = ipBinToString(ip.lastHostBin);
            document.getElementById("broadcast").innerText = ipToString(ip.broadcast);
            document.getElementById("broadcast-bin").innerText = ipBinToString(ip.broadcastBin);
            document.getElementById("available-hosts").innerText = ip.availabelHosts;
            document.getElementById("ip-type").innerText = ip.isPrivete() ? "IP Privada" : "IP pública";
            document.getElementById("ip-class").innerText = "Clase " + ip.ipClass;

        }

        setTimeout(function () {

            dataInput.classList.add("hide");
            document.getElementById("results-loader").classList.add("hide");
            document.getElementById("display-results").classList.remove("hide");

        }, 2000);

        document.getElementById("address").innerText = ipToString(ip.address);
        document.getElementById("net-address").innerText = ipToString(ip.netAddress) + " /" + ip.prefix;
        document.getElementById("mask").innerText = ipToString(ip.mask);
        document.getElementById("broadcast").innerText = ipToString(ip.broadcast);

        let typeSubnet = this.classList.contains("vlsm");

        document.getElementById("btn-download").addEventListener("click", function () {

            /*alert('Esta función no está disponible temporalmente');
            return;*/

            let numSubnets = typeSubnet ? hostBySubnet.length : numSubnetInput.value;
            if (!typeSubnet) numHosts = numHostInput.value;
            let tag = typeSubnet ? "VLSM" : "FLSM";
            let hostsFound = 0;

            for (let i = 0; i < results.length; i++) hostsFound += Number(results[i].availabelHosts);


            let html = "<main id='report'>";

            html += "<div id=\"details\" class=\"\">\n" +
                "            <div id=\"client\">\n" +
                "                <div class=\"to\">DIRECCIÓN IP:</div>\n" +
                "                <h2 class=\"name\">" + ipToString(ip.netAddress) + " /" + ip.prefix + "</h2>\n" +
                "                <div class=\"address\">" + ipToString(ip.mask) + "</div>\n" +
                "                <div class=\"email\"><a href=\"https://arcadio.gq/calculadora-subredes-calculadora-subredes-vlsm.html\">Subdividir otra red</a></div>\n" +
                "            </div>\n" +
                "            <div id=\"invoice\">\n" +
                "                <h1>SUBREDES " + tag + "</h1>\n" +
                "                <div class=\"date\">Número de subredes: " + numSubnets + "</div>\n" +
                "                <div class=\"date\">" + (typeSubnet ? "Número total de hosts" : "Hosts por subred") + ": " + numHosts + "</div>\n" +
                "            </div>\n" +
                "            <div class=\"clearfix\"></div>\n" +
                "        </div>";


            html += "<div id=\"data\"><table border=\"0\" cellspacing=\"0\" cellpadding=\"0\" class=\"data\"><thead>\n" +
                "              <tr>\n" +
                "                  <th class=\"no\">#</th>\n" +
                "                  <th class=\"\">Hosts</th>\n" +
                "                  <th class=\"\">Subred</th>\n" +
                "                  <th class=\"qty\">Máscara</th>\n" +
                "                  <th class=\"\">Primer Host</th>\n" +
                "                  <th class=\"\">Último Host</th>\n" +
                "                  <th class=\"\">Broadcast</th>\n" +
                "              </tr>\n" +
                "              </thead>";
           html += "<tbody>";

           for (let i = 0; i < results.length; i++){

               html += "<tr>" +
                   "<td class='no'>" + (i + 1) + "</td>" +
                   "<td class='qty'>" + results[i].availabelHosts + "</td>" +
                   "<td class='unit'>" + ipToString(results[i].netAddress) + " /" + results[i].prefix + "</td>" +
                   "<td class='qty'>" + ipToString(results[i].mask) + "</td>" +
                   "<td class='unit'>" + ipToString(results[i].firstHost) + "</td>" +
                   "<td class='qty'>" + ipToString(results[i].lastHost) + "</td>" +
                   "<td class='unit'>" + ipToString(results[i].broadcast) + "</td>" +
                   "</tr>"

           }
           html += "</tbody></table>";

           html += "<table><tfoot>\n" +
               "              <tr>\n" +
               "                  <td colspan=\"4\">Número direcciones proporcionadas pora la IP</td>\n" +
               "                  <td>" + ip.availabelHosts + "</td>\n" +
               "              </tr>\n" +
               "              <tr>\n" +
               "                  <td colspan=\"4\">Número de Hosts solicitados</td>\n" +
               "                  <td>" + (typeSubnet ? numHosts : hostsFound) + "</td>\n" +
               "              </tr>\n" +
               "              <tr class=\"" + (typeSubnet ? "" : "hide") + "\">\n" +
               "                  <td colspan=\"4\">Número de Hosts encontrados</td>\n" +
               "                  <td>" + hostsFound + "</td>\n" +
               "              </tr>\n" +
               "              <tr>\n" +
               "                  <td colspan=\"4\">Porcentaje de direcciones utilizadas</td>\n" +
               "                  <td>" + Math.round((typeSubnet ? numHosts : hostsFound) / ip.availabelHosts * 100) + "%</td>\n" +
               "              </tr>\n" +
               "              <tr>\n" +
               "                  <td colspan=\"4\">Porcentaje de direcciones encontradas</td>\n" +
               "                  <td>" + Math.round(hostsFound / ip.availabelHosts * 100) + "%</td>\n" +
               "              </tr>\n" +
               "              </tfoot></table></div></main>";

           let header = "<header>\n" +
               "        <table>\n" +
               "            <tr>\n" +
               "                <th>\n" +
               "                    <div id=\"logo\">\n" +
               "                        <img src=\"reporte/logo.png\" alt=\"arcadio logo\">\n" +
               "                    </div>\n" +
               "                </th>\n" +
               "                <td>\n" +
               "                    <div id=\"company\">\n" +
               "                        <h2 class=\"name\">Calculadora FLSM & VLSM</h2>\n" +
               "                        <div><a href=\"https://arcadio.gq\">https://arcadio.gq</a></div>\n" +
               "                        <div><a href=\"mailto:info@arcadio.gq\">info@arcadio.gq</a></div>\n" +
               "                    </div>\n" +
               "                </td>\n" +
               "            </tr>\n" +
               "        </table>\n" +
               "    </header>";

           let footer = "<footer>\n" +
               "        <table width=\"100%\">\n" +
               "            <tr>\n" +
               "                <td width=\"33%\" align=\"left\">{DATE j-m-Y}</td>\n" +
               "                <td width=\"33%\" align=\"center\">{PAGENO}/{nbpg}</td>\n" +
               "                <td width=\"33%\" style=\"text-align: right;\">\n" +
               "                    Calculadora " + tag + " - &copy; <a href=\"mailto:arcadio-nseng@hotmail.com\">@arcadio</a>\n" +
               "                </td>\n" +
               "            </tr>\n" +
               "        </table>\n" +
               "    </footer>";

           if(!reportGenerated){

               document.getElementById("results-loader").classList.remove("hide");

               $.post("php/subnet_report.php", {
                   html: html,
                   header: header,
                   footer: footer,
                   net: ipToString(ip.netAddress) + " /" + ip.prefix,
                   type: tag
               }, report, "json").fail(function (xhr){
                   alert("Se ha producido un error desconocido: " + xhr.responseText);
               })

               reportGenerated = true;

           } else document.getElementById("btn-modal").click();
            // html2pdf().from(html + header + footer).save();

        });

    });

    document.getElementById("recalc-button").addEventListener("click", function () {

        document.getElementById("results-loader").classList.remove("hide");

        setTimeout(function () {

            dataInput.classList.remove("hide");
            document.getElementById("results-loader").classList.add("hide");
            document.getElementById("display-results").classList.add("hide");

        }, 1000);

        dataInput.reset();
        resultsContent.style.marginLeft = 0 + "%";
        reportGenerated = false;

    });

    document.getElementById("left").addEventListener("click", function () {

        if (currentPage > 1){

            pagMargin = (currentPage - 2) * 100;
            currentPage--;

        } else {

            pagMargin = (numPages - 1) * 100;
            currentPage = numPages;

        }

        resultsContent.style.marginLeft = -pagMargin + "%";
        document.getElementById("page").innerText = currentPage + "/" + numPages;

    });

    document.getElementById("right").addEventListener("click", function () {

        if (currentPage < numPages){

            pagMargin = currentPage * 100;
            currentPage++;

        } else {

            pagMargin = 0;
            currentPage = 1;

        }

        resultsContent.style.marginLeft = -pagMargin + "%";
        document.getElementById("page").innerText = currentPage + "/" + numPages;

    });

}catch (e) {
    // alert("Error data input: " + e);
}


/*********************************************** OBJETO IpAddress *************************************************/
function IpAddress(ip, prefix) {

    this.prefix = Number(prefix);
    this.address = ipToArray(ip);
    this.addressBin = ipToBin(this.address);
    this.maskBin = getMaskBin(this.prefix);
    this.mask = ipBinToDec(this.maskBin);
    this.wildcardBin = getWildcardMaskBin(this.maskBin);
    this.wildcard = ipBinToDec(this.wildcardBin);
    this.netAddressBin = getNetAddressBin(this.addressBin, this.maskBin);
    this.netAddress = ipBinToDec(this.netAddressBin);
    this.hostAddressBin = getHostAddressBin(this.addressBin, this.prefix);
    this.hostAddress = ipBinToDec(this.hostAddressBin);
    this.broadcastBin = getBroadcastAddressBin(this.netAddressBin, this.prefix);
    this.broadcast = ipBinToDec(this.broadcastBin);
    this.firstHost = getFirstHostAddress(this.netAddress);
    this.firstHostBin = ipToBin(this.firstHost);
    this.lastHost = getLastHostAddress(this.broadcast);
    this.lastHostBin = ipToBin(this.lastHost);
    this.availabelHostBits = IP_LENGTH - this.prefix;
    this.availabelHosts = Math.pow(2, this.availabelHostBits) - 2;
    this.availabelSubnets = Math.pow(2, this.availabelHostBits);
    this.isLegal = true;
    this.ipClass = getIpClass(ip);

}

IpAddress.prototype.vlsmCalc = function(hostBySubnet){

    let workingIp = ipToString(this.netAddress);
    let results = new Array(hostBySubnet.length);
    let numHost = 0;
    let errors = false;

    for (let i = 0; i < hostBySubnet.length; i++){

        let hostBits = getHostBits(hostBySubnet[i]);
        let subnetBits = (IP_LENGTH - this.prefix) - hostBits;
        let prefix = this.prefix + subnetBits;

        results[i] = new IpAddress(workingIp, prefix);

        numHost += results[i].availabelHosts;

        if (numHost > this.availabelHosts) {

            results[i].isLegal = false;
            errors = true;

        }

        let mask = ipBinToDec(getMaskBin(prefix));
        let lastOct = getLastOct(mask);
        let step = 256 - mask[lastOct];

        let aux = [];

        for (let j = 0; j < results[i].netAddress.length; j++) aux[j] = results[i].netAddress[j];

        aux[lastOct] += step;

        if (aux[lastOct] > 255){

            for (let j = lastOct - 1; j >= 0; j--){

                if (aux[j] < 255){

                    aux[j]++;
                    break;

                }

            }

            aux[lastOct] = 0;

        }

        workingIp = ipToString(aux);


    }

    try {

        fillResultInfo(numHost, this, hostBySubnet);

        if (!errors) {

            document.getElementById("info-text").innerText = "ÉXITO! Se aprovecha el " +
                Math.round((numHost / this.availabelHosts) * 100) + "% del número de hosts disponibles";

            document.getElementById("btn-download").classList.remove("hide");

        } else document.getElementById("btn-download").classList.add("hide");

        document.getElementById("all-hosts").innerText = numHost + "";
        
    } catch (e) {



    }

    return results;

};

IpAddress.prototype.flsmCalc = function(numSubnets){

    let netBits = getSubnetBits(numSubnets); // 1. calcular el número de bits necesarios para alcanzar n subredes
    let prefix = this.prefix + netBits; // 2. calcular el prefijo de la subred
    let mask = ipBinToDec(getMaskBin(prefix)); // 3. calcular la mascara de subred
    let lastOct = getLastOct(mask);
    let step = 256 - mask[lastOct]; // 4. calcular el saldo de red

    let results = new Array(numSubnets);
    let netAddress = new Array(4);

    for (let i = 0; i < netAddress.length; i++) netAddress[i] = this.netAddress[i];

    for (let i = 0; i < numSubnets; i++){

        results[i] = new IpAddress(ipToString(netAddress), prefix);
        netAddress[lastOct] += step;

        if (netAddress[lastOct] > 255){

            for (let j = lastOct - 1; j >= 0; j--){

                if (netAddress[j] < 255){

                    netAddress[j]++;
                    break;

                }

            }

            netAddress[lastOct] = 0;

        }

    }

    return results;

};

IpAddress.prototype.isPrivete = function(){

    if (this.ipClass === "A" && this.address[0] === 10) return true;
    else if (this.ipClass === "B" && (this.address[0] === 172 && (this.address[1] >= 16 && this.address[1] <= 31))) return true;
    else return this.ipClass === "C" && (this.address[0] === 192 && this.address[1] === 168);

};



/************************************************* ÁREA DE FUNCIONES *************************************************/


function fillResultsTable(results) {

    const TABLE_MAX_LENGTH = 5;
    numPages = Math.ceil(results.length / TABLE_MAX_LENGTH);
    resultsContent.innerHTML = "";
    let i = 0;

    for (let page = 0; page < numPages; page++){

        let table = document.createElement("table");
        let thead = document.createElement("thead");
        let titleRow = document.createElement("tr");
        let tableFields = ["Subred", "Nº de Hosts", "IP de red", "Máscara", "Primer Host", "Último Host", "Broadcast"];

        for (let i = 0; i < tableFields.length; i++){

            let tableCell = document.createElement("td");
            let cellText = document.createTextNode(tableFields[i]);

            tableCell.appendChild(cellText);
            titleRow.appendChild(tableCell);

        }

        thead.appendChild(titleRow);
        table.appendChild(thead);

        let tbody = document.createElement("tbody");
        let numRows = 0;

        for (i; i < results.length; i++){

            let dataRow = document.createElement("tr");
            let tableData = ["Subred " + (i + 1), results[i].availabelHosts, ipToString(results[i].netAddress) + " /" + results[i].prefix, ipToString(results[i].mask),
                ipToString(results[i].firstHost), ipToString(results[i].lastHost), ipToString(results[i].broadcast)];

            for (let j = 0; j < tableData.length; j++){

                let cell = document.createElement("td");
                let cellText = document.createTextNode(tableData[j]);

                cell.appendChild(cellText);
                dataRow.appendChild(cell);

            }

            if (!results[i].isLegal) dataRow.classList.add("red", "lighten-4", "white-text");

            tbody.appendChild(dataRow);

            if (++numRows === TABLE_MAX_LENGTH) break;

        }

        i++;

        table.appendChild(tbody);
        resultsContent.appendChild(table);
        table.style.width = (100 / numPages) + "%";
        table.classList.add("responsive-table", "highlight", "results-table");

    }

    if (numPages === 1) document.getElementsByClassName("pagination-controls")[0].classList.add("hide");
    else document.getElementsByClassName("pagination-controls")[0].classList.remove("hide");

    currentPage = 1;
    resultsContent.style.width = numPages * 100 + "%";
    document.getElementById("page").innerText = currentPage + "/" + numPages;
}

function fillResultInfo(totalHosts, ip, hostBySubnet){

    let resultInfo = document.getElementById("result-info");
    let resultText = document.getElementById("info-text");
    let resultIcon = document.getElementById("info-icon");
    document.getElementById("aval-hosts").innerText = ip.availabelHosts;


    let reqHost = 0;

    for (let i = 0; i < hostBySubnet.length; i++) reqHost += hostBySubnet[i];

    document.getElementById("req-hosts").innerText = reqHost + "";

    resultInfo.classList.remove("hide");

    if (totalHosts > ip.availabelHosts){

        resultInfo.classList.remove("green", "green-text");
        resultIcon.classList.remove("white-text");
        resultInfo.classList.add("red", "red-text");
        resultIcon.classList.add("orang-text", "text-darken-4");
        resultIcon.innerText = "warning";
        resultText.innerText = "ERROR! La dirección ip " + ipToString(ip.address) + " no pude direccionar a " + totalHosts + " host";
        document.getElementById("info-warning").classList.remove("hide");

    } else {

        resultInfo.classList.remove("red", "red-text");
        resultIcon.classList.remove("orang-text", "text-darken-4");
        resultInfo.classList.add("green", "green-text");
        resultIcon.classList.add("white-text");
        resultIcon.innerText = "info";
        document.getElementById("info-warning").classList.add("hide");

    }

}



function getLastOct(mask) {

    for (let i = mask.length - 1; i >= 0; i--) if (mask[i] > 0) return i;

}

function ipBinToString(ipBin) {

    let ipBinString = "";

    for (let i = 0; i < ipBin.length; i += 8){

        let sub = ipBin.slice(i, i + 8);
        let oct = "";

        for (let j = 0; j < sub.length; j++) oct += sub[j];

        oct = (i !== 24) ? oct + "." : oct;

        ipBinString += oct;

    }

    return ipBinString;

}

function ipToString(ip) {

    return ip[0] + "." + ip[1] + "." + ip[2] + "." + ip[3];

}

function getLastHostAddress(broadcastAddress) {

    let lastHostAddress = new Array(4);

    for (let i = 0; i < lastHostAddress.length; i++) lastHostAddress[i] = broadcastAddress[i];

    lastHostAddress[3]--;

    return lastHostAddress;

}

function getBroadcastAddressBin(netAddressBin, prefix) {

    let broadcastAddress = new Array(IP_LENGTH);
    let i;

    for (i = 0; i < prefix; i++) broadcastAddress[i] = netAddressBin[i];
    for (i; i < IP_LENGTH; i++) broadcastAddress[i] = 1;

    return broadcastAddress;

}

function getFirstHostAddress(netAddress) {

    let firstHostAddress = new Array(4);

    for (let i = 0; i < firstHostAddress.length; i++) firstHostAddress[i] = netAddress[i];

    firstHostAddress[3]++;

    return firstHostAddress;

}


function getNetAddressBin(ipBin, maskBin) {

    let netAddresBin = new Array(IP_LENGTH);

    for (let i = 0; i < netAddresBin.length; i++) netAddresBin[i] = Number(ipBin[i]) * Number(maskBin[i]);

    return netAddresBin;

}


function ipBinToDec(ipBin) {

    let ipDec = new Array(4);
    let k = 0;

    for (let i = 0; i < ipBin.length; i += 8){

        let sub = ipBin.slice(i, i + 8);
        let oct = "";

        for (let j = 0; j < sub.length; j++) oct += sub[j];

        ipDec[k] = parseInt(oct, 2);
        k++;

    }

    return ipDec;

}

function getMaskBin(prefix) {

    let maskBin = new Array(IP_LENGTH);
    let i;

    for (i = 0; i < prefix; i++) maskBin[i] = 1;
    for (i; i < IP_LENGTH; i++) maskBin[i] = 0;

    return maskBin;

}

function ipToBin(ipArray) {

    let ipBin = new Array(IP_LENGTH);
    let j = 0;

    for (let i = 0; i < ipArray.length; i++){

        let bin = ipArray[i].toString(2);

        while (bin.length < 8) bin = "0" + bin; //asegurarse de que el binario tenga longitud de 8 caracteres

        for (let k = 0; k < bin.length; k++){

            ipBin[j] = bin.charAt(k);
            j++;

        }

    }

    return ipBin;

}

function ipToArray(ip) {

    let ipArray = new Array(4);
    let oct = "";
    let j = 0;

    for (let i = 0; i < ip.length; i++){

        if (ip.charAt(i) === '.') {

            ipArray[j] = Number(oct);
            oct = "";
            j++;

        } else oct += ip.charAt(i);

    }

    ipArray[j] = Number(oct);

    return ipArray;

}


function getIpClass(ipAddress) {

    let firstOct = Number(ipAddress.substr(0, ipAddress.indexOf('.') + 1));

    if (firstOct <= 127) return "A";
    else if (firstOct <= 191) return "B";
    else if (firstOct <= 223) return "C";
    else if (firstOct <= 239) return "D";
    else return "E";

}

function getHostBits(numHosts) {

    if (Number(numHosts) > 0){

        return Math.ceil(Math.log((Number(numHosts) + 2)) / Math.log(2));

    } else return 0;

}

function getSubnetBits(numSubnets) {

    numSubnets = Number (numSubnets);

    if (numSubnets > 0){

        return Math.ceil(Math.log(numSubnets) / Math.log(2));

    } else return 0;

}

function getDefaultPrefix(prefix) {

    if (prefix === "A") return 8;
    else if (prefix === "B") return 16;
    else if (prefix === "C") return 24;
    else return null;

}

function getNumHosts(prefix, numSubnets) {

    let numHosts;
    let availableHostBits = IP_LENGTH - prefix;
    let availableHostAdresses = Math.pow(2, availableHostBits);

    if (availableHostAdresses < numSubnets) numHosts = 0;
    else {

        let subnetBits = getSubnetBits(Number(numSubnets));
        let hostBits = IP_LENGTH - (Number(prefix) + Number(subnetBits));
        numHosts = hostBits > 0 ? Math.pow(2, hostBits) - 2 : 0;

    }

    return numHosts;

}

function getNumSubnets(prefix, numHost) {

    let numSubnet;
    let availableHostBits = IP_LENGTH - prefix;
    let availableHostAdresses = Math.pow(2, availableHostBits);

    if (availableHostAdresses < numHost){

        numSubnet = 0;

    } else {

        let hostBits = Number(getHostBits(numHost));
        let netBits = IP_LENGTH - hostBits - prefix;
        numSubnet = netBits > 0 ? Math.pow(2, netBits) : 1;

    }

    return numSubnet;

}

function getWildcardMaskBin(maskBin) {

    let wilcardBin = new Array(IP_LENGTH);

    for (let i = 0; i < maskBin.length; i++) wilcardBin[i] = maskBin[i] === 1 ? 0 : 1;

    return wilcardBin;

}

function getHostAddressBin(addressBin, prefix) {

    let hostAddressbin = new Array(IP_LENGTH);

    for (let i = 0; i < prefix; i++) hostAddressbin[i] = 0;
    for (let i = prefix; i < IP_LENGTH; i++) hostAddressbin[i] = addressBin[i];

    return hostAddressbin;

}

function report(res) {

    if(res.error !== undefined) alert(res.error);

    document.getElementById("results-loader").classList.add("hide");
    // window.location.assign(res.url);
    document.getElementById("file-name").innerText = res.name;
    document.getElementById("file-size").innerText = res.size;
    document.getElementById("file-time").innerText = res.time;
    document.getElementById("file-url").innerText = res.url;
    document.getElementById("download").setAttribute("href", res.url);
    document.getElementById("btn-modal").click();
}

