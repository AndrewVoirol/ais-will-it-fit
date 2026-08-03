/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React from 'react';
import { PresetOption } from '../types';

interface ProductSelectorProps {
    products: PresetOption[];
    onSelect: (prompt: string) => void;
    disabled: boolean;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ products, onSelect, disabled }) => {
    return (
        <div className="flex flex-col items-center mt-6 w-full animate-fade-in">
            <span className="text-sm text-zinc-500 mb-3 font-medium uppercase tracking-wider">Or try a preset object</span>
            <div className="flex flex-wrap justify-center gap-3">
                {products.map(product => (
                    <button
                        key={product.id}
                        onClick={() => onSelect(product.prompt)}
                        disabled={disabled}
                        className="px-5 py-2 bg-white border border-zinc-200 rounded-full text-sm font-semibold text-zinc-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                    >
                        {product.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ProductSelector;
