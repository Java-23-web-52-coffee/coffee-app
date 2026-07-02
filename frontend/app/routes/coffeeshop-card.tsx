import type {CoffeeShop} from "./search-page";

type CoffeeShopProps = {
    coffeeShop: CoffeeShop
}


export const CoffeeShop = (props: CoffeeShopProps) => {

    const coffeeShop = props.CoffeeShop
    return (
        <div className="border-4 p-8">
            <img src={/coffeeshop-placeholder.png} alt={coffeeShop.title} />
            <h2 className="text-xl font-bold my-8">{coffeeShop.title}</h2>
        </div>
    )
}