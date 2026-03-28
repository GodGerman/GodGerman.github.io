import { FamiliaAPI } from './api.js';
import { UIHandler } from './ui.js';
import { TreeRenderer } from './tree.js';

document.addEventListener('DOMContentLoaded', async () => {
    // URL de la API de Google Apps Script conectada a Google Sheets
    const googleAppsScriptUrl = 'https://script.google.com/macros/s/AKfycbxXQJLrdKa6jsQOI8Fr5O_EVoCk2ODTIKnobDKu1X1K_pqdp2WEbtE3SvApos3mji_N/exec'; 
    
    const api = new FamiliaAPI(googleAppsScriptUrl);
    const tree = new TreeRenderer('tree-network');
    const ui = new UIHandler(api, tree);

    // Carga inicial
    const initialMembers = await api.getMembers();

    tree.onNodeClick = (member) => ui.openInfoModal(member);

    tree.render(initialMembers);
});
