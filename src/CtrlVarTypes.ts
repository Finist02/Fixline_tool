import * as fs from 'fs';
import * as vscode from 'vscode';

export class CtrlComment {
    private doxyKeys: any[] = new Array;
    private mdKeys: any[] = new Array;
    constructor() {
        this.doxyKeys = [];
        this.mdKeys = [];
    }
    private initReplkeys() {
        if (this.doxyKeys.length > 0) {
            return;
        }
        this.doxyKeys.push("/**");
        this.mdKeys.push("");
        this.doxyKeys.push("*/");
        this.mdKeys.push("");
        this.doxyKeys.push("@brief");
        this.mdKeys.push("");
        this.doxyKeys.push("@details");
        this.mdKeys.push("");
        this.doxyKeys.push(new RegExp("@availability ", "g"));
        this.mdKeys.push("### Availability\n");
        this.doxyKeys.push(new RegExp("@code{.ctl}", "g"));
        this.mdKeys.push("```");
        this.doxyKeys.push(new RegExp("@code", "g"));
        this.mdKeys.push("```");
        this.doxyKeys.push(new RegExp("@endcode", "g"));
        this.mdKeys.push("```");
        this.doxyKeys.push(new RegExp("@example\\s*\\$exampleRelPath.*", "g"));
        this.mdKeys.push("");
        this.doxyKeys.push(new RegExp("@snippets*$exampleRelPath.*", "g"));
        this.mdKeys.push("");
        // function params
        this.doxyKeys.push("@param[in] ");
        this.mdKeys.push("+ **In parameter:** ");
        this.doxyKeys.push("@param[out] ");
        this.mdKeys.push("+ **Out parameter:** ");
        this.doxyKeys.push("@param[inout] ");
        this.mdKeys.push("+ **In/Out parameter:** ");
        this.doxyKeys.push("@param ");
        this.mdKeys.push("+ **Parameter:** ");
        this.doxyKeys.push("@return ");
        this.mdKeys.push("**Return:** ");
        // exceptions, warnings notes
        this.doxyKeys.push(new RegExp("@exception ", "g"));
        this.mdKeys.push("### Exception\n");
        this.doxyKeys.push(new RegExp("@warning ", "g"));
        this.mdKeys.push("### Warning\n");
        this.doxyKeys.push(new RegExp("@note ", "g"));
        this.mdKeys.push("### Note\n");
    }

    public doxyStringToMdString(doxyStr: string) {
        if (doxyStr === "")
            return "";
        var text = doxyStr;
        this.initReplkeys();
        if (text.startsWith("/**")) {
            text = text.substr(3);
        }
        if (text.endsWith("*/")) {
            text = text.substr(0, text.length - 2);
        }
        for (var index = 0; index < this.doxyKeys.length; index++) {
            var doxyKey = this.doxyKeys[index];
            var mdKey = this.mdKeys[index];
            text = text.replace(doxyKey, mdKey);
        }
        return text;
    }
}


export class CtrlKnownItem {
    public name: string;
    private docuStr: string;
    private completionItemKind: vscode.CompletionItemKind;
    private ctrlComment = new CtrlComment();
    static readonly enumConverterComplItem = [
        'Text',
        'Method',
        'Function',
        'Constructor',
        'Field',
        'Variable',
        'Class',
        'Interface',
        'Module',
        'Property',
        'Unit',
        'Value',
        'Enum',
        'Keyword',
        'Snippet',
        'Color',
        'Reference',
        'File',
        'Folder',
        'EnumMember',
        'Constant',
        'Struct',
        'Event',
        'Operator',
        'TypeParameter',
        'User',
        'Issue'
    ];
    constructor() {
        this.name = "";
        this.docuStr = "";
        this.completionItemKind = vscode.CompletionItemKind.Text;
    }
    //----------------------------------------------------------------------------
    /**
     * Returns the item kind.
     */
    public getCompletionItemKind() {
        return this.completionItemKind;
    }
    //----------------------------------------------------------------------------
    /**
     * Convert ctrl constant item to human readeable string.
     * Used for completion provider.
     * @return markdown string
     */
    public toString() {
        return this.docuStr;
    }
    //----------------------------------------------------------------------------
    public getSnippetString() {
        if (this.completionItemKind == vscode.CompletionItemKind.Function) {
            return this.name + "($0)";
        }
        return this.name;
    }
    //----------------------------------------------------------------------------
    public fromJsonItem(element: CtrlDefines, format: string, completionItemKind: string) {
        this.name = element.id;
        if (format !== "") {
            let docu = "";
            if (element.description) {
                docu = this.ctrlComment.doxyStringToMdString(element.description.join("\n"));
            }
            let definition = "";
            if (element.definition) {
                definition = element.definition;
            }
            let text = format.replace("${definition}", definition);
            text = text.replace("${description}", docu);
            this.docuStr = text;
        }
        if (CtrlKnownItem.enumConverterComplItem.indexOf(completionItemKind) > -1) {
            this.completionItemKind = CtrlKnownItem.enumConverterComplItem.indexOf(completionItemKind);
        }
    }
}

export class CtrlKnownItems {
    private items = new Map<string, CtrlKnownItem>();
    constructor() {
    }
    //------------------------------------------------------------------------------
    public hasItem(itemId: string) {
        return this.items.has(itemId);
    }
    //------------------------------------------------------------------------------
    public get(itemId: string) {
        return this.items.get(itemId);
    }
    //------------------------------------------------------------------------------
    public add(item: CtrlKnownItem) {
        if (!this.items.has(item.name)) {
            this.items.set(item.name, item);
        }
    }
    //------------------------------------------------------------------------------
    public getMatchedKeys(word: string) {
        var matchedKeys:CtrlKnownItem[] = new Array();
        for (const [key, value] of this.items) {
            if (key !== undefined &&
                key.toLowerCase().startsWith(word.toLowerCase())) {
                matchedKeys.push(value);
            }
        }
        return matchedKeys;
    }
}
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

export let ctrlKnowItems = new CtrlKnownItems();

interface CtrlDefinitionsItem {
    hover: {
        format: string;
    }
    completionItemKind: string;
    defines: CtrlDefines[];
}
interface CtrlDefines {
    definition: string;
    description: string[];
    id: string;
}

export function readFileFunctions() {
    const extensionFixline = vscode.extensions.getExtension('Danil.fixline-tool');
    if (extensionFixline == undefined) return;
    fs.readdirSync(extensionFixline.extensionPath + '/definitions/').forEach(fileName => {
        const fileData = fs.readFileSync(extensionFixline.extensionPath + '/definitions/' + fileName, 'utf8');
        const parsedJson: CtrlDefinitionsItem = JSON.parse(fileData);
        for (let i = 0; i < parsedJson.defines.length; i++) {
            const item = new CtrlKnownItem();
            item.fromJsonItem(parsedJson.defines[i], parsedJson.hover.format, parsedJson.completionItemKind);
            ctrlKnowItems.add(item);
        }
    });
    const knownItems: string[] | undefined = vscode.workspace.getConfiguration("FixLineTool.Syntax").get("KnownItems");
    // if (knownItems == undefined) return;
    // for (let i = 0; i < knownItems.length; i++) {
    //     const item = new CtrlKnownItem();
    //     define.id = knownItems[i];
    //     ctrlKnowItems.add(define);

    // }
}

