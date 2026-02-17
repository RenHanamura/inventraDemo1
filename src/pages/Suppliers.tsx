import { useState } from "react";
import { Plus, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSuppliers, useCreateSupplier, useUpdateSupplier, useDeleteSupplier, Supplier } from "@/hooks/useSuppliers";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Suppliers() {
  const { t } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({ name: "", contact_name: "", email: "", phone: "", status: "active" });

  const { data: suppliers = [], isLoading } = useSuppliers();
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ name: supplier.name, contact_name: supplier.contact_name || "", email: supplier.email || "", phone: supplier.phone || "", status: supplier.status });
    } else {
      setEditingSupplier(null);
      setFormData({ name: "", contact_name: "", email: "", phone: "", status: "active" });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => { setIsModalOpen(false); setEditingSupplier(null); setFormData({ name: "", contact_name: "", email: "", phone: "", status: "active" }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) { await updateSupplier.mutateAsync({ id: editingSupplier.id, ...formData }); }
    else { await createSupplier.mutateAsync(formData); }
    handleCloseModal();
  };

  const handleDelete = () => { if (deletingSupplier) { deleteSupplier.mutate(deletingSupplier.id); setDeletingSupplier(null); } };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('suppliers.title')}</h1>
          <p className="text-muted-foreground">{t('suppliers.subtitle')}</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('suppliers.addSupplier')}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">{t('suppliers.supplierList')}</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('suppliers.company')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('suppliers.contact')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('suppliers.email')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('suppliers.phone')}</TableHead>
                  <TableHead>{t('suppliers.status')}</TableHead>
                  <TableHead className="text-right">{t('suppliers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{supplier.name}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{supplier.contact_name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{supplier.contact_name || "-"}</TableCell>
                    <TableCell className="hidden lg:table-cell"><p className="font-medium">{supplier.email}</p></TableCell>
                    <TableCell className="hidden sm:table-cell"><p className="font-medium">{supplier.phone}</p></TableCell>
                    <TableCell>
                      <Badge variant={supplier.status === "active" ? "default" : "secondary"} className={supplier.status === "active" ? "bg-success hover:bg-success/80" : ""}>
                        {supplier.status === "active" ? t('suppliers.active') : t('suppliers.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenModal(supplier)}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingSupplier(supplier)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {suppliers.length === 0 && <div className="text-center py-12 text-muted-foreground">{t('suppliers.noSuppliers')}</div>}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>{editingSupplier ? t('suppliers.editSupplier') : t('suppliers.addSupplier')}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">{t('suppliers.companyName')}</Label>
              <Input id="companyName" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactName">{t('suppliers.contactPerson')}</Label>
              <Input id="contactName" value={formData.contact_name} onChange={(e) => setFormData((prev) => ({ ...prev, contact_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('suppliers.email')}</Label>
                <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('suppliers.phone')}</Label>
                <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">{t('suppliers.status')}</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData((prev) => ({ ...prev, status: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('suppliers.active')}</SelectItem>
                  <SelectItem value="inactive">{t('suppliers.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseModal} disabled={createSupplier.isPending || updateSupplier.isPending}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending}>
                {(createSupplier.isPending || updateSupplier.isPending) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingSupplier ? t('suppliers.updateSupplier') : t('suppliers.addSupplier')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingSupplier} onOpenChange={() => setDeletingSupplier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('suppliers.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('suppliers.deleteDesc', { name: deletingSupplier?.name || '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('common.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
