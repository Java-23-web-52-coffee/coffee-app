import {Button} from "flowbite-react";
export default function coffeeshopMainPage() {
        return (
            <>
                <h1 className={"text-center m-4 text-5xl"}>Coffeeshop main page</h1>

                <div className={'bg-slate-300 p-7 mt-20 flex flex-col md:flex-row items-center gap-4'}>
                    <img src="/coffeeshop-placeholder.png" alt="coffee shop" className={'w-full md:w-auto'}/>
                    <div className={'bg-white p-6 sm:p-10 m-7 rounded-md shadow-md flex-1'}>
                        <div className={'w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-2'}>
                            <ul className= {'text-sm md:text-base lg:text-lg'}>
                                <li>Name Example Shop</li>
                                <li>Address ipsum ipsum ipsum</li>
                                <li>Hours 7 am - 5 pm</li>
                                <li>Associated categories ipsum ipsum ipsum</li>
                            </ul>
                            <button className={'bg-slate-300 px-4 py-2 rounded-md hover:bg-slate-400'}>
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </>
        )
    }