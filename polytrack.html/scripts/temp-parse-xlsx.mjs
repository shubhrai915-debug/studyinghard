
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

async function main() {
    try {
        const buf = await readFile('/Volumes/orico/Web/polytrack.best-main/polytrack.best-Coverage-Drilldown-2025-12-23.xlsx');
        // detailed log to debug what XLSX is
        // console.log('XLSX keys:', Object.keys(XLSX)); 

        // Support for different import behaviors
        const readFn = XLSX.read || (XLSX.default && XLSX.default.read);
        const utils = XLSX.utils || (XLSX.default && XLSX.default.utils);

        if (!readFn) {
            throw new Error('Could not find read function in xlsx package');
        }

        const workbook = readFn(buf, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        const result = {};

        sheetNames.forEach(name => {
            const sheet = workbook.Sheets[name];
            const json = utils.sheet_to_json(sheet);
            result[name] = json;
        });

        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error('Error reading file:', err);
        process.exit(1);
    }
}

main();
