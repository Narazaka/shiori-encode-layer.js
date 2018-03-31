import * as Encoding from "encoding-japanese";
import * as assert from "power-assert";
import { Shiori } from "shioriloader";
import * as sinon from "sinon";
import { ShioriEncodeLayer } from "../lib/shiori-encode-layer";

const crlf = "\x0d\x0a";

const encode = (content: string, charset: Encoding.Encoding) =>
    Encoding.convert(content, {to: charset, type: "string"}) as string;

class ChildShiori implements Shiori {
    static requestString(charset: string, value: string) {
        return `SHIORI/3.0 200 OK${crlf}Charset: ${charset}${crlf}Value: ${value}${crlf}${crlf}`;
    }

    charset: string;
    value: string;
    encodedValue: string;

    constructor(charset: string, value: string, charset2: Encoding.Encoding) {
        this.charset = charset;
        this.value = value;
        this.encodedValue = encode(value, charset2);
    }

    async load(_: string) { return 1; }

    async request(_: string) {
        return ChildShiori.requestString(this.charset, this.encodedValue);
    }

    async unload() { return 1; }
}

const sjisChildShiori = () => new ChildShiori("Shift_JIS", "能勢電鉄と表現", "SJIS");

describe("ShioriEncodeLayer", () => {
    describe("load()", () => {
        it("works", async () => {
            const childShiori = sjisChildShiori();
            const shiori = new ShioriEncodeLayer(childShiori);

            const dirpath = "C:\\SSP\\ghost\\ikaga\\ghost\\master\\";
            assert(1 === await shiori.load(dirpath));
        });
    });

    describe("request()", () => {
        it("works", async () => {
            const childShiori = sjisChildShiori();
            const shiori = new ShioriEncodeLayer(childShiori);

            const requestSpy = sinon.spy(childShiori, "request");
            const request = `GET SHIORI/3.0${crlf}Charset: Shift_JIS${crlf}ID: ソビエトロシア${crlf}${crlf}`;
            const response = await shiori.request(request);
            assert(response === ChildShiori.requestString(childShiori.charset, childShiori.value));
            assert(requestSpy.calledOnceWith(encode(request, "SJIS")));
        });
    });

    describe("unload()", () => {
        it("works", async () => {
            const childShiori = sjisChildShiori();
            const shiori = new ShioriEncodeLayer(childShiori);

            assert(1 === await shiori.unload());
        });
    });
});
