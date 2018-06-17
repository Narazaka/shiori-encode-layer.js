import * as Encoding from "encoding-japanese";
import { Shiori } from "shioriloader";

export interface RawShiori {
    load(dirpath: string): Promise<number>;
    request(request: ArrayBuffer): Promise<ArrayBuffer>;
    unload(): Promise<number>;
}

const charsetHeaderCodes = [0x0a, 0x63, 0x68, 0x61, 0x72, 0x73, 0x65, 0x74, 0x3a, 0x20]; // "\x0acharset: "
const charsetHeaderCodesLength = charsetHeaderCodes.length;
const charsetHeaderAlphaStart = 1;
const charsetHeaderAlphaEnd = 8; // ":"の位置
const cr = 0x0d;

export class ShioriEncodeLayer implements Shiori {
    static encodeRequest(content: string) {
        return ShioriEncodeLayer.encode(content, ShioriEncodeLayer.getStringCharset(content));
    }

    static decodeResponse(content: ArrayBuffer) {
        return ShioriEncodeLayer.decode(content, ShioriEncodeLayer.getArrayBufferCharset(content));
    }

    static getStringCharset(content: string) {
        const charsetMatch = content.match(/Charset: ([^\x0d\x0a]+)/i);
        if (!charsetMatch) return "AUTO";
        const charset = charsetMatch[1];
        return ShioriEncodeLayer.charsetType(charset);
    }

    static getArrayBufferCharset(content: ArrayBuffer) {
        const chars = new Uint8Array(content);
        let headerDetectIndex = 0;
        let charsetHeaderValueStart = -1;
        for (let charIndex = 0; charIndex < chars.length; ++charIndex) {
            let char = chars[charIndex];
            if (charsetHeaderAlphaStart <= headerDetectIndex && headerDetectIndex < charsetHeaderAlphaEnd) {
                // 小文字へ変換
                char |= 0x20; // tslint:disable-line no-bitwise
            }
            if (char === charsetHeaderCodes[headerDetectIndex]) {
                ++headerDetectIndex;
            } else {
                headerDetectIndex = 0;
            }
            if (headerDetectIndex === charsetHeaderCodesLength) {
                charsetHeaderValueStart = charIndex + 1;
                break;
            }
        }
        if (charsetHeaderValueStart < 0) return "AUTO";
        const charsetHeaderValueCodes = [];
        for (let charIndex = charsetHeaderValueStart; charIndex < chars.length; ++charIndex) {
            const char = chars[charIndex];
            if (char === cr) break;
            charsetHeaderValueCodes.push(char);
        }
        return ShioriEncodeLayer.charsetType(String.fromCharCode(...charsetHeaderValueCodes));
    }

    private static charsetType(charset: string) {
        const lowerCharset = charset.toLowerCase();
        if (lowerCharset === "shift_jis") return "SJIS";
        if (lowerCharset === "cp932") return "SJIS";
        if (lowerCharset === "utf-8") return "UTF8";
        return "AUTO";
    }

    private static encode(content: string, charset: Encoding.Encoding) {
        return new Uint8Array(
            Encoding.convert(content, {to: charset, from: "UNICODE", type: "array"}) as number[],
        ).buffer as ArrayBuffer;
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
