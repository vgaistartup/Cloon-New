
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { productService } from '../data/productService';
import { Product, ProductCategory, PRODUCT_CATEGORIES_CONFIG } from '../data/products';
import { PlusIcon, Trash2Icon, XIcon, ArrowLeftIcon, GripVerticalIcon, FilterIcon } from './icons';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface AdminDashboardProps {
    onBack: () => void;
}

const CATEGORIES: { label: string; value: ProductCategory }[] = [
    { label: 'Top (Shirts, T-Shirts)', value: 'top' },
    { label: 'Bottom (Pants, Skirts)', value: 'bottom' },
    { label: 'Shoes', value: 'shoes' },
    { label: 'Outerwear (Jackets, Coats)', value: 'outerwear' },
    { label: 'Accessory (Bags, Hats)', value: 'accessory' },
];

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBack }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Partial<Product> & { urls: string[] } | null>(null);
    const [modalError, setModalError] = useState<string | null>(null);
    
    const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);

    const loadProducts = async () => {
        setIsLoading(true);
        try {
            const fetchedProducts = await productService.getProducts();
            setProducts(fetchedProducts);
        } catch (error) {
            console.error("Failed to load products:", error);
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
            if (Array.isArray(product.urls) && product.urls.length > 0) {
                urls = [...product.urls]; 
            } else if (product.url) {
                urls = [product.url];
            }
        }
        
        const affiliateLink = (product?.affiliateLink === '#' || !product?.affiliateLink) ? '' : product.affiliateLink;

        setEditingProduct({ 
            ...(product || {}), 
            urls, 
            category: product?.category || 'top', 
            subCategory: product?.subCategory,
            affiliateLink,
            description: product?.description || ''
        });
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
            affiliateLink: editingProduct.affiliateLink || '',
            url: cleanUrls[0],
            urls: cleanUrls,
            category: editingProduct.category as ProductCategory,
            subCategory: editingProduct.subCategory,
            description: editingProduct.description,
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
        // Removed blocking confirm dialog
        try {
            await productService.deleteProduct(productId);
            await loadProducts();
        } catch (error: any) {
            console.error("Failed to delete product:", error);
            const message = error.message || "Unknown error";
            alert(`Could not delete product. ${message}`);
        }
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        setDraggedItemIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault(); 
        if (draggedItemIndex === null || draggedItemIndex === index) return;
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedItemIndex === null || draggedItemIndex === index || !editingProduct) return;

        const newUrls = [...editingProduct.urls];
        const itemToMove = newUrls[draggedItemIndex];
        
        newUrls.splice(draggedItemIndex, 1);
        newUrls.splice(index, 0, itemToMove);

        setEditingProduct({ ...editingProduct, urls: newUrls });
        setDraggedItemIndex(null);
    };
    
    const availableSubCategories = React.useMemo(() => {
        if (!editingProduct?.category) return [];
        let configId = editingProduct.category;
        if (editingProduct.category === 'outerwear') configId = 'top';
        
        const config = PRODUCT_CATEGORIES_CONFIG.find(c => c.id === configId) || PRODUCT_CATEGORIES_CONFIG.find(c => c.id === 'top');
        
        if (!config && editingProduct.category === 'outerwear') {
             return PRODUCT_CATEGORIES_CONFIG.find(c => c.id === 'top')?.subCategories || [];
        }
        
        return config?.subCategories.filter(sc => sc !== 'All') || [];
    }, [editingProduct?.category]);

    return (
        <div className="p-4 sm:p-8 bg-white min-h-full">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <button onClick={onBack} className="p-2 rounded-full hover:bg-surface-subtle transition-colors">
                            <ArrowLeftIcon className="w-6 h-6 text-text-primary" />
                        </button>
                        <h1 className="text-xl sm:text-3xl font-bold text-text-primary">Admin Dashboard</h1>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black text-white px-4 py-2.5 rounded-btn flex items-center gap-2 hover:scale-[1.01] transition-all text-sm sm:text-base shadow-elevated"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Add Product</span>
                    </button>
                </div>

                {isLoading ? <div className="flex justify-center items-center h-64"><Spinner /></div> : (
                    <>
                        <div className="bg-white shadow-soft border border-border rounded-card overflow-hidden hidden md:block">
                            <table className="min-w-full leading-normal">
                                <thead>
                                    <tr>
                                        <th className="px-5 py-4 border-b border-border bg-white text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Product</th>
                                        <th className="px-5 py-4 border-b border-border bg-white text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Brand</th>
                                        <th className="px-5 py-4 border-b border-border bg-white text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Category</th>
                                        <th className="px-5 py-4 border-b border-border bg-white text-left text-xs font-bold text-text-secondary uppercase tracking-wider">SubCategory</th>
                                        <th className="px-5 py-4 border-b border-border bg-white text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Price</th>
                                        <th className="px-5 py-4 border-b border-border bg-white"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {products.map(product => (
                                        <tr key={product.id} className="hover:bg-surface-subtle transition-colors">
                                            <td className="px-5 py-4 border-b border-border bg-white text-sm">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 w-12 h-16 border border-border rounded-md overflow-hidden">
                                                        <img className="w-full h-full object-cover" src={product.url} alt={product.name} />
                                                    </div>
                                                    <div className="ml-4">
                                                        <p className="text-text-primary whitespace-no-wrap font-semibold">{product.name}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 border-b border-border bg-white text-sm">
                                                <p className="text-text-primary whitespace-no-wrap">{product.brand}</p>
                                            </td>
                                            <td className="px-5 py-4 border-b border-border bg-white text-sm">
                                                <span className="px-2 py-1 bg-gray-100 rounded-md text-xs font-medium text-gray-600 uppercase tracking-wide">
                                                    {product.category || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 border-b border-border bg-white text-sm">
                                                <span className="text-gray-600">
                                                    {product.subCategory || '-'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 border-b border-border bg-white text-sm">
                                                <p className="text-text-primary whitespace-no-wrap font-medium">${product.price}</p>
                                            </td>
                                            <td className="px-5 py-4 border-b border-border bg-white text-sm text-right">
                                                <button onClick={() => handleOpenModal(product)} className="text-text-primary hover:text-blue-600 mr-4 font-semibold transition-colors">Edit</button>
                                                <button onClick={() => handleDelete(product.id)} className="text-red-500 hover:text-red-700 inline-flex items-center transition-colors">
                                                <Trash2Icon className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="md:hidden space-y-4">
                            {products.map(product => (
                                <div key={product.id} className="bg-white rounded-card shadow-soft border border-border p-4">
                                    <div className="flex gap-4 items-start">
                                        <img src={product.url} alt={product.name} className="w-16 h-20 object-cover rounded-lg flex-shrink-0 border border-border" />
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <p className="font-bold text-text-primary">{product.name}</p>
                                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-text-secondary uppercase">{product.category || 'N/A'}</span>
                                            </div>
                                            <p className="text-sm text-text-secondary">{product.brand}</p>
                                            {product.subCategory && <p className="text-xs text-text-secondary mt-1">({product.subCategory})</p>}
                                            <p className="text-sm text-text-primary mt-2 font-semibold">${product.price}</p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-4 mt-3 pt-3 border-t border-border">
                                        <button onClick={() => handleOpenModal(product)} className="text-sm font-semibold text-text-primary hover:text-blue-600">Edit</button>
                                        <button onClick={() => handleDelete(product.id)} className="text-sm font-semibold text-red-500 hover:text-red-700 flex items-center gap-1">
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
                <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-float w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto border border-border">
                        <button onClick={handleCloseModal} className="absolute top-4 right-4 text-text-secondary hover:text-text-primary" disabled={isSaving}><XIcon className="w-6 h-6"/></button>
                        <h2 className="text-2xl font-bold text-text-primary mb-6">{editingProduct.id ? 'Edit Product' : 'Add Product'}</h2>
                        <div className="space-y-4">
                            <input type="text" name="name" value={editingProduct.name || ''} onChange={handleInputChange} placeholder="Product Name" className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all" />
                            <input type="text" name="brand" value={editingProduct.brand || ''} onChange={handleInputChange} placeholder="Brand" className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all" />
                            
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="relative flex-1">
                                    <select 
                                        name="category" 
                                        value={editingProduct.category || 'top'} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all appearance-none text-text-primary"
                                    >
                                        {CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                                        <FilterIcon className="w-4 h-4" />
                                    </div>
                                </div>
                                
                                <div className="relative flex-1">
                                    <select 
                                        name="subCategory" 
                                        value={editingProduct.subCategory || ''} 
                                        onChange={handleInputChange} 
                                        className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all appearance-none text-text-primary"
                                    >
                                        <option value="">Select Subcategory...</option>
                                        {availableSubCategories.map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary">
                                        <FilterIcon className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" name="price" value={editingProduct.price || ''} onChange={handleInputChange} placeholder="Price" className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all" />
                                <input type="number" name="salePrice" value={editingProduct.salePrice || ''} onChange={handleInputChange} placeholder="Sale Price (Optional)" className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all" />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-2">Product Description</label>
                                <textarea 
                                    name="description" 
                                    value={editingProduct.description || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="Enter product details and description..." 
                                    className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all min-h-[100px] resize-y"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-text-secondary mb-2">Image URLs (Drag to Reorder)</label>
                                <div className="space-y-2">
                                    {editingProduct.urls.map((url, index) => (
                                        <div 
                                            key={index} 
                                            className={`flex items-center gap-2 p-2 bg-white border border-border rounded-lg transition-all ${draggedItemIndex === index ? 'opacity-50 border-dashed border-gray-400' : ''}`}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, index)}
                                            onDragOver={(e) => handleDragOver(e, index)}
                                            onDrop={(e) => handleDrop(e, index)}
                                        >
                                            <div className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-text-primary p-1">
                                                <GripVerticalIcon className="w-5 h-5" />
                                            </div>
                                            <span className="text-xs font-bold text-text-secondary w-4 select-none">{index + 1}</span>
                                            <input
                                                type="text"
                                                value={url}
                                                onChange={(e) => handleUrlChange(index, e.target.value)}
                                                placeholder={`Image URL ${index + 1}`}
                                                className="flex-1 p-1.5 border-none focus:ring-0 text-sm bg-transparent"
                                            />
                                            <button 
                                                onClick={() => removeUrlInput(index)} 
                                                className="p-1.5 text-text-secondary hover:text-red-500 rounded-full transition-colors" 
                                                disabled={editingProduct.urls.length <= 1}
                                            >
                                                <Trash2Icon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                {editingProduct.urls.length < 5 && (
                                    <button onClick={addUrlInput} className="text-sm text-text-primary font-medium hover:underline mt-3 flex items-center gap-1">
                                        <PlusIcon className="w-3 h-3" /> Add another image
                                    </button>
                                )}
                            </div>

                            <input type="text" name="affiliateLink" value={editingProduct.affiliateLink || ''} onChange={handleInputChange} placeholder="Affiliate Link" className="w-full p-3.5 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-border focus:shadow-soft outline-none transition-all" />
                            
                            {modalError && (
                                <div className="bg-red-50 text-red-800 p-3 rounded-lg text-sm my-4 border border-red-100">
                                    <p className="font-semibold">Error</p>
                                    <p>{modalError}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-6 border-t border-border mt-4">
                                <button onClick={handleCloseModal} className="px-5 py-2.5 bg-white border border-border hover:bg-surface-subtle rounded-btn font-medium transition-colors text-sm" disabled={isSaving}>Cancel</button>
                                <button onClick={handleSave} className="px-5 py-2.5 bg-black text-white rounded-btn w-28 flex items-center justify-center font-medium hover:scale-[1.02] transition-all text-sm shadow-elevated" disabled={isSaving}>
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
