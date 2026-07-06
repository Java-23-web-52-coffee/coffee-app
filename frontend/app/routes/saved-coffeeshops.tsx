import {Button, Card} from "flowbite-react";


export default function SavedCoffeeshop() {
    return (
        <>
            <h1 className={"text-center m-4 text-5xl"}>Saved</h1>
            {/*//Coffee shop card*/}
            <div className={"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2"}>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-400 text-white'} size="xs">Saved</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-400 text-white'} size="xs">Saved</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-400 text-white'} size="xs">Saved</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
                <Card className="max-w-sm m-4 p-6 border-black">
                    <div className={"flex justify-end"}>
                        <Button className={'bg-slate-400 text-white'} size="xs">Saved</Button>
                    </div>
                    <h5 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white text-center">
                        Coffeeshop Name
                    </h5>
                    <div>
                        <img src="/coffeeshop-placeholder.png" alt="coffee shop"/>
                    </div>
                    <p className="font-normal text-center">
                        Coffeeshop tags/categories
                    </p>
                    <Button className={"bg-slate-300 text-black"}>
                        View Details
                        <svg className="ml-2 h-4 w-4" fill="black" viewBox="0 0 20 20"
                             xmlns="http://www.w3.org/2000/svg">
                            <path
                                fillRule="evenodd"
                                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </Button>
                </Card>
            </div>
        </>
    )
}
