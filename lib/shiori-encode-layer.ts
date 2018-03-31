import * as Encoding from "encoding-japanese";
import { Shiori } from "shioriloader";

export class ShioriEncodeLayer implements Shiori {
    private static encodeRequest(content: string) {
        const charsetMatch = content.match(/Charset: ([^\x0d\x0a]+)/i);
        if (!charsetMatch) return content;
        const charset = charsetMatch[1];
        return ShioriEncodeLayer.encode(content, charset);
    }

    private static decodeResponse(content: string) {
        const charsetMatch = content.match(/Charset: ([^\x0d\x0a]+)/i);
        if (!charsetMatch) return content;
        const charset = charsetMatch[1];
        return ShioriEncodeLayer.decode(content, charset);
    }

    private static charsetType(charset: string) {
        const lowerCharset = charset.toLowerCase();
        if (lowerCharset === "shift_jis") return "SJIS";
        if (lowerCharset === "utf-8") return "UTF8";
        return "AUTO";
    }

    private static encode(content: string, charset: string) {
        return Encoding.convert(content, {
            from: "UNICODE",
            to: ShioriEncodeLayer.charsetType(charset),
            type: "string",
        }) as string;
    }

    private static decode(content: string, charset: string) {
        return Encoding.convert(content, {
            from: ShioriEncodeLayer.charsetType(charset),
            to: "UNICODE",
            type: "string",
        }) as string;
    }

    childShiori: Shiori;

    constructor(shiori: Shiori) {
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
