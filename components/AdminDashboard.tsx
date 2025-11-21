/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { productService } from '../data/productService';
import { Product } from '../data/products';
import { PlusIcon, Trash2Icon, XIcon, ArrowLeftIcon } from './icons';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface AdminDashboardProps {
    onBack: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> & { urls: string[] } | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const fetchedProducts = await productService.getProducts();
            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Failed to load products:", error);
            // In a real app, this might be a toast notification, using console for now to avoid alert spam if loop
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadProducts();
    }, []);

    const handleOpenModal = (product?: Product) => {
        let urls: string[] = [''];
        
        if (product) {
            // The productService now guarantees urls is a clean array, so we can trust it more
            if (Array.isArray(product.urls) && product.urls.length > 0) {
                urls = [...product.urls]; // Clone to avoid mutating state directly
            } else if (product.url) {
                urls = [product.url];
            }
        }
        
        setEditingProduct({ ...(product || {}), urls });
        setIsModalOpen(true);
        setModalError(null);
    };

    const handleCloseModal = () => {
        if (isSaving) return;
        setEditingProduct(null);
        setIsModalOpen(false);
        setModalError(null);
    };

    const handleSave = async () => {
        if (!editingProduct) return;
        
        setIsSaving(true);
        setModalError(null);

        // Clean empty URLs
        const cleanUrls = (editingProduct.urls || []).map(url => url.trim()).filter(Boolean);

        if (!editingProduct.name || !editingProduct.brand || editingProduct.price === undefined || cleanUrls.length === 0) {
            setModalError("Please fill all required fields: Name, Brand, Price, and at least one Image URL.");
            setIsSaving(false);
            return;
        }

        const productToSave: Product = {
            id: editingProduct.id || `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: editingProduct.name,
            brand: editingProduct.brand,
            price: editingProduct.price,
            salePrice: editingProduct.salePrice,
            affiliateLink: editingProduct.affiliateLink || '#',
            url: cleanUrls[0],
            urls: cleanUrls,
        };

        try {
            if (editingProduct.id) {
                await productService.updateProduct(productToSave);
            } else {
                await productService.addProduct(productToSave);
            }
            await loadProducts();
            handleCloseModal();
        } catch (error) {
            console.error("Failed to save product:", error);
            setModalError(getFriendlyErrorMessage(error, "Failed to save product"));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (productId: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await productService.deleteProduct(productId);
                await loadProducts();
            } catch (error) {
                console.error("Failed to delete product:", error);
                alert(getFriendlyErrorMessage(error, "Could not delete product from the database"));
            }
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!editingProduct) return;
        const { name, value } = e.target;
        const isNumeric = ['price', 'salePrice'].includes(name);
        setEditingProduct({
            ...editingProduct,
            [name]: isNumeric ? (value === '' ? undefined : Number(value)) : value,
        });
    };
    
    const handleUrlChange = (index: number, value: string) => {
        if (!editingProduct) return;
        const newUrls = [...editingProduct.urls];
        newUrls[index] = value;
        setEditingProduct({ ...editingProduct, urls: newUrls });
    };

    const addUrlInput = () => {
        if (editingProduct && editingProduct.urls.length < 5) {
            setEditingProduct({ ...editingProduct, urls: [...editingProduct.urls, ''] });
        }
    };

    const removeUrlInput = (index: number) => {
        if (editingProduct && editingProduct.urls.length > 1) {
            const newUrls = editingProduct.urls.filter((_, i) => i !== index);
            setEditingProduct({ ...editingProduct, urls: newUrls });
        }
    };

    return (
        <div className="p-4 sm:p-8 bg-gray-50 min-h-screen">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-200">
                            <ArrowLeftIcon className="w-6 h-6 text-gray-700" />
                        </button>
                        <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black text-white px-3 py-2 sm:px-4 rounded-lg flex items-center gap-2 hover:bg-gray-800 text-sm sm:text-base"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Add Product</span>
                    </button>
                </div>

                {isLoading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : (
                    <>
                        {/* Desktop Table View */}
                        <div className="bg-white shadow-md rounded-lg overflow-x-auto hidden md:block">
                            <table className="min-w-full leading-normal">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Product</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Brand</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Price</th>
                                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id}>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-12 h-16">
                                                        <img className="w-full h-full object-cover rounded" src={product.url} alt={product.name} />
                                                    </div>
                                                    <div className="ml-3">
                                                        <p className="text-gray-900 whitespace-no-wrap font-semibold">{product.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 whitespace-no-wrap">{product.brand}</p>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                                                <p className="text-gray-900 whitespace-no-wrap">${product.price}</p>
                                            </td>
                                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                                                <button onClick={() => handleOpenModal(product)} className="text-indigo-600 hover:text-indigo-900 mr-4 font-semibold">Edit</button>
                                                <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-900 inline-flex items-center">
                                                <Trash2Icon className="w-5 h-5"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Card View */}
                        <div className="md:hidden space-y-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-lg shadow p-4">
                                    <div className="flex gap-4 items-start">
                                        <img src={product.url} alt={product.name} className="w-16 h-24 object-cover rounded-md flex-shrink-0" />
                                        <div className="flex-grow">
                                            <p className="font-bold text-gray-900">{product.name}</p>
                                            <p className="text-sm text-gray-600">{product.brand}</p>
                                            <p className="text-sm text-gray-800 mt-2 font-semibold">${product.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-4 mt-3 pt-3 border-t">
                                        <button onClick={() => handleOpenModal(product)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className="text-sm font-semibold text-red-600 hover:text-red-800 flex items-center gap-1">
                                            <Trash2Icon className="w-4 h-4" /> Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

            </div>

            {isModalOpen && editingProduct && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                        <button onClick={handleCloseModal} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800" disabled={isSaving}><XIcon className="w-6 h-6"/></button>
                        <h2 className="text-2xl font-bold mb-4">{editingProduct.id ? 'Edit Product' : 'Add Product'}</h2>
                        <div className="space-y-4">
                            <input type="text" name="name" value={editingProduct.name || ''} onChange={handleInputChange} placeholder="Product Name" className="w-full p-2 border rounded" />
                            <input type="text" name="brand" value={editingProduct.brand || ''} onChange={handleInputChange} placeholder="Brand" className="w-full p-2 border rounded" />
                            <input type="number" name="price" value={editingProduct.price || ''} onChange={handleInputChange} placeholder="Price" className="w-full p-2 border rounded" />
                            <input type="number" name="salePrice" value={editingProduct.salePrice || ''} onChange={handleInputChange} placeholder="Sale Price (Optional)" className="w-full p-2 border rounded" />
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Image URLs (up to 5)</label>
                                {editingProduct.urls.map((url, index) => (
                                    <div key={index} className="flex items-center gap-2 mb-2">
                                        <input
                                            type="text"
                                            value={url}
                                            onChange={(e) => handleUrlChange(index, e.target.value)}
                                            placeholder={`Image URL ${index + 1}`}
                                            className="w-full p-2 border rounded"
                                        />
                                        <button onClick={() => removeUrlInput(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-full" disabled={editingProduct.urls.length <= 1}>
                                            <Trash2Icon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                {editingProduct.urls.length < 5 && (
                                    <button onClick={addUrlInput} className="text-sm text-indigo-600 hover:underline mt-1">Add another image</button>
                                )}
                            </div>

                            <input type="text" name="affiliateLink" value={editingProduct.affiliateLink || ''} onChange={handleInputChange} placeholder="Affiliate Link" className="w-full p-2 border rounded" />
                            
                            {modalError && (
                                <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm my-4 border border-red-200">
                                    <p className="font-semibold">Error</p>
                                    <p>{modalError}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4">
                                <button onClick={handleCloseModal} className="px-4 py-2 bg-gray-200 rounded" disabled={isSaving}>Cancel</button>
                                <button onClick={handleSave} className="px-4 py-2 bg-black text-white rounded w-24 flex items-center justify-center" disabled={isSaving}>
                                    {isSaving ? <Spinner /> : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;