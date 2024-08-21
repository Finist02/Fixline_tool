import * as fs from 'fs';
import * as vscode from 'vscode';
export const varTypes: string[] = [
    'blob'
    , 'bool'
    , 'void'
    , 'shape'
    , 'anytype'
    , 'mixed'
    , 'char'
    , 'bit_32'
    , 'double'
    , 'file'
    , 'float'
    , 'int'
    , 'uint'
    , 'long'
    , 'ulong'
    , 'string'
    , 'time'
    , 'langString'
    , 'unsigned'
    , 'dyn_blob'
    , 'dyn_bool'
    , 'dyn_char'
    , 'dyn_errClass'
    , 'short'
    , 'vector'
    , 'mapping'
    , 'dyn_mapping'
    , 'dyn_int'
    , 'dyn_uint'
    , 'dyn_long'
    , 'dyn_ulong'
    , 'dyn_float'
    , 'dyn_time'
    , 'dyn_string'
    , 'dyn_anytype'
    , 'dyn_dyn_anytype'
    , 'dyn_dyn_mapping'
    , 'dyn_dyn_int'
    , 'dyn_dyn_uint'
    , 'dyn_dyn_long'
    , 'dyn_dyn_ulong'
    , 'dyn_dyn_float'
    , 'dyn_dyn_time'
    , 'dyn_dyn_string'
    , 'dyn_dyn_bool'
    , 'dyn_dyn_char'
    , 'dyn_langString'
    , 'dyn_bit32'
    , 'dyn_mixed'
    , 'dyn_dyn_mixed'
    , 'shared_ptr'
    , 'vector'
    , 'void'
];


export const reservedWords: string[] = [
    'class'
    , 'public'
    , 'private'
    , 'static'
    , 'const'
]

export const ctrlUsesDlls: string[] = [
    'CtrlPostgreSQLExtension'
    , 'CtrlXml'
];

export let ctrlDefinitions: string[] = [];
interface CtrlDefinitions {
    hover: {
        format: string;
    }
    completionItemKind: string;
    defines: [
        {
            definition: string;
            description: string[];
            id: string;
        }
    ];
}

export function readFileFunctions() {
    const extensionFixline = vscode.extensions.getExtension('Danil.fixline-tool');
    if (extensionFixline == undefined) return;
    fs.readdirSync(extensionFixline.extensionPath + '/definitions/').forEach(fileName => {
        const fileData = fs.readFileSync(extensionFixline.extensionPath + '/definitions/' + fileName, 'utf8');
        const parsedJson: CtrlDefinitions = JSON.parse(fileData);
        for (let i = 0; i < parsedJson.defines.length; i++) {
            ctrlDefinitions.push(parsedJson.defines[i].id);
        }
    });
    // const fileToRead = extensionFixline.extensionPath + '/definitions/ctrl.functions.json';
}
