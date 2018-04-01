import * as Encoding from "encoding-japanese";
import { Shiori } from "shioriloader";

export interface RawShiori {
    load(dirpath: string): Promise<number>;
    request(request: string | Buffer): Promise<string | Buffer>;
    unload(): Promise<number>;
}

export class ShioriEncodeLayer implements Shiori {
    private static encodeRequest(content: string | Buffer) {
        return ShioriEncodeLayer.encode(content, ShioriEncodeLayer.getCharset(content));
    }

    private static decodeResponse(content: string | Buffer) {
        return ShioriEncodeLayer.decode(content, ShioriEncodeLayer.getCharset(content));
    }

    private static getCharset(content: string | Buffer) {
        const charsetMatch =
            (content instanceof Buffer ? content.toString("ascii") : content).match(/Charset: ([^\x0d\x0a]+)/i);
        const charset = charsetMatch ? charsetMatch[1] : "AUTO";
        return ShioriEncodeLayer.charsetType(charset);
    }

    private static charsetType(charset: string) {
        const lowerCharset = charset.toLowerCase();
        if (lowerCharset === "shift_jis") return "SJIS";
        if (lowerCharset === "utf-8") return "UTF8";
        return "AUTO";
    }

    private static encode(content: string | Buffer, charset: Encoding.Encoding) {
        return Encoding.convert(content, {
            from: "UNICODE",
            to: charset,
            type: "string",
        }) as string;
    }

    private static decode(content: string | Buffer, charset: Encoding.Encoding) {
        return Encoding.convert(content, {
            from: charset,
            to: "UNICODE",
            type: "string",
        }) as string;
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

    async request(request: string | Buffer) {
        return ShioriEncodeLayer.decodeResponse(
            await this.childShiori.request(
                ShioriEncodeLayer.encodeRequest(request),
            ),
        );
    }
}
