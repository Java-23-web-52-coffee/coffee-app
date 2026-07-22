import {type Shop, ShopSchema} from "./shop.schema.ts";
import {sql} from "../../utils/database.utils.ts";


export async function selectAllShops (): Promise<Shop[]> {
    const rowList = await sql`SELECT id, address, hours, lat, lng, name, phone, image_url FROM shop`
    return ShopSchema.array().parse(rowList)
