import { ExtensionContext, SecretStorage } from "vscode"

export default class AuthSettings {
    private static _instance: AuthSettings;

    constructor(private secretStorage: SecretStorage) { }

    static init(context: ExtensionContext): void {
        /*
        Create instance of new AuthSettings.
        */
        AuthSettings._instance = new AuthSettings(context.secrets);
    }

    static get instance(): AuthSettings {
        /*
        Getter of our AuthSettings existing instance.
        */
        return AuthSettings._instance;
    }

    async storeAuthData(key: string, token: string): Promise<void> {
        /*
        Update values in bugout_auth secret storage.
        */
        this.secretStorage.store(key, token);
    }

    async getAuthData(key: string): Promise<string | undefined> {
        /*
        Retrieve data from secret storage.
        */
        return await this.secretStorage.get(key);
    }
}