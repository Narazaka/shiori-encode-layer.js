import * as Encoding from "encoding-japanese";
import { Shiori } from "shioriloader";

export interface RawShiori {
    load(dirpath: string): Promise<number>;
    request(request: ArrayBuffer): Promise<ArrayBuffer>;
    unload(): Promise<number>;
}

export class ShioriEncodeLayer implements Shiori {
    private static encodeRequest(content: string) {
        return ShioriEncodeLayer.encode(content, ShioriEncodeLayer.getCharset(content));
    }

    private static decodeResponse(content: ArrayBuffer) {
        return ShioriEncodeLayer.decode(content, ShioriEncodeLayer.getCharset(content));
    }

    private static getCharset(content: string | ArrayBuffer) {
        const charsetMatch = typeof content === "string" ? content.match(/Charset: ([^\x0d\x0a]+)/i) : null;
        /*const charsetMatch =
            (content instanceof Buffer ? content.toString("ascii") : content).match(/Charset: ([^\x0d\x0a]+)/i);*/
        const charset = charsetMatch ? charsetMatch[1] : "Shift_JIS";
        return ShioriEncodeLayer.charsetType(charset);
    }

    private static charsetType(charset: string) {
        const lowerCharset = charset.toLowerCase();
        if (lowerCharset === "shift_jis") return "SJIS";
        if (lowerCharset === "utf-8") return "UTF8";
        return "AUTO";
    }

    private static encode(content: string, charset: Encoding.Encoding) {
        return new Uint8Array(Encoding.convert(content, {to: charset, type: "array"}) as number[]).buffer as ArrayBuffer;
    }

    private static decode(content: ArrayBuffer, charset: Encoding.Encoding) {
        return Encoding.convert(new Uint8Array(content), {to: "UNICODE", from: charset, type: "string"}) as string;
    }

    childShiori: RawShiori;

    constructor(shiori: RawShiori) {
        this.childShiori = shiori;
    }

    load(dirpath: string) {
        return this.childShiori.load(dirpath);
    }

    unload() {
        return this.childShiori.unload();
    }

    async request(request: string) {
        return ShioriEncodeLayer.decodeResponse(
            await this.childShiori.request(
                ShioriEncodeLayer.encodeRequest(request),
            ),
        );
    }
}
