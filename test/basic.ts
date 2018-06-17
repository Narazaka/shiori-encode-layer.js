import * as Encoding from "encoding-japanese";
import * as assert from "power-assert";
import * as sinon from "sinon";
import { RawShiori, ShioriEncodeLayer } from "../lib/shiori-encode-layer";

const crlf = "\x0d\x0a";

class ChildShiori implements RawShiori {
    static requestString(charset: string, value: string) {
        return `SHIORI/3.0 200 OK${crlf}Charset: ${charset}${crlf}Value: ${value}${crlf}${crlf}`;
    }

    charset: string;
    value: string;

    constructor(charset: string, value: string) {
        this.charset = charset;
        this.value = value;
    }

    async load(_: string) { return 1; }

    async request(_: ArrayBuffer) {
        const val = Encoding.convert(
            ChildShiori.requestString(this.charset, this.value),
            {to: "SJIS", from: "UNICODE", type: "array"},
        ) as number[];

        return new Uint8Array(val).buffer as ArrayBuffer;
    }

    async unload() { return 1; }
}

const sjisChildShiori = () => new ChildShiori("Shift_JIS", "能勢電鉄と表現");

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
            assert.deepEqual(requestSpy.firstCall.args[0], new Buffer(Encoding.convert(request, "SJIS")).buffer);
            assert(response === ChildShiori.requestString(childShiori.charset, childShiori.value));
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
