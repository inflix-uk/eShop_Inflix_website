"use client";
import { Fragment, useEffect } from "react";
import {
  Dialog,
  Transition,
  DialogPanel,
  DialogTitle,
  TransitionChild,
} from "@headlessui/react";
import Link from "next/link";
import { XMarkIcon } from "@heroicons/react/24/outline";
import CartItemsList from "@/app/components/cart/CartItemsList";
import { useCart } from "@/app/components/cart/useCart";

interface NavbarCartProps {
  openCart: boolean;
  setOpenCart: React.Dispatch<React.SetStateAction<boolean>>;
  setCartItemCount: React.Dispatch<React.SetStateAction<number>>;
}

const NavbarCart = ({
  openCart,
  setOpenCart,
  setCartItemCount,
}: NavbarCartProps) => {
  // Stock is only looked up while the drawer is open.
  const { items, stock, itemCount, subtotal, updateQuantity, remove, refresh } =
    useCart({ checkStock: openCart });

  useEffect(() => {
    setCartItemCount(itemCount);
  }, [itemCount, setCartItemCount]);

  // Re-read on open, in case the cart was changed without announcing it.
  useEffect(() => {
    if (openCart) refresh();
  }, [openCart, refresh]);

  return (
    <Transition show={openCart} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={() => setOpenCart(false)}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </TransitionChild>
        <div className="fixed inset-0">
          <div className="absolute inset-0">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full">
              <TransitionChild
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <DialogPanel className="pointer-events-auto w-screen max-w-md">
                  <div className="flex h-full flex-col bg-white py-6 shadow-xl px-4">
                    <>
                      <div className="flex items-start justify-between">
                        <DialogTitle className="text-lg font-medium text-gray-900">
                          Shopping Cart
                        </DialogTitle>
                        <button
                          type="button"
                          className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                          onClick={() => setOpenCart(false)}
                        >
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                    </>
                    <div className="mt-4 px-4 overflow-y-auto scrollbar-thin scrollbar-webkit">
                      <CartItemsList
                        items={items}
                        stock={stock}
                        onQuantityChange={updateQuantity}
                        onRemove={remove}
                      />
                    </div>
                    <div className="border-t border-gray-200 px-4 py-6 sm:px-6 sticky w-full bottom-0 bg-white">
                      <div className="flex justify-between text-base font-medium text-gray-900">
                        <p>Subtotal</p>
                        <p>£ {subtotal}</p>
                      </div>
                      <p className="text-sm text-gray-500">
                        Shipping and taxes calculated at checkout.
                      </p>
                      <div className="mt-6">
                        <Link
                          href="/checkout"
                          className="flex items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-secondary"
                          prefetch={true}
                        >
                          Checkout
                        </Link>
                      </div>
                      <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                        <p>
                          or{" "}
                          <button
                            type="button"
                            className="font-medium text-primary hover:text-green-500"
                            onClick={() => setOpenCart(false)}
                          >
                            Continue Shopping &rarr;
                          </button>
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default NavbarCart;
