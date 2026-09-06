import { useState } from 'react';
import { Plus, Trash2, BookOpen, FileText } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../i18n';
import { v4 as uuidv4 } from 'uuid';
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  Modal,
  Page,
  PageHeader,
  Textarea,
  Input,
} from './ui';

export function KnowledgeBase() {
  const { t } = useTranslation();
  const {
    knowledgeBases,
    knowledgeDocuments,
    addKnowledgeBase,
    removeKnowledgeBase,
    addKnowledgeDocument,
    removeKnowledgeDocument,
  } = useAppStore();

  const [showCreateKB, setShowCreateKB] = useState(false);
  const [newKBName, setNewKBName] = useState('');
  const [newKBDesc, setNewKBDesc] = useState('');
  const [selectedKBId, setSelectedKBId] = useState<string | null>(null);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');

  const selectedKB = knowledgeBases.find((kb) => kb.id === selectedKBId);
  const selectedDocs = selectedKBId ? knowledgeDocuments[selectedKBId] || [] : [];

  const handleCreateKB = () => {
    if (!newKBName.trim()) return;
    const kb = {
      id: uuidv4(),
      name: newKBName.trim(),
      description: newKBDesc.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addKnowledgeBase(kb);
    setNewKBName('');
    setNewKBDesc('');
    setShowCreateKB(false);
    setSelectedKBId(kb.id);
  };

  const handleAddDoc = () => {
    if (!newDocTitle.trim() || !newDocContent.trim() || !selectedKBId) return;
    const doc = {
      id: uuidv4(),
      knowledgeBaseId: selectedKBId,
      title: newDocTitle.trim(),
      content: newDocContent.trim(),
      createdAt: new Date().toISOString(),
    };
    addKnowledgeDocument(doc);
    setNewDocTitle('');
    setNewDocContent('');
    setShowAddDoc(false);
  };

  return (
    <Page>
      <PageHeader
        title={t('kb.title')}
        description={t('kb.desc')}
        actions={
          <Button icon={<Plus size={15} />} onClick={() => setShowCreateKB(true)}>
            {t('kb.add')}
          </Button>
        }
        className="mb-6"
      />

      <div className="flex gap-4">
        {/* 左侧：知识库列表 */}
        <div className="w-64 shrink-0">
          {knowledgeBases.length === 0 ? (
            <Card className="flex flex-col items-center py-8 text-center">
              <BookOpen size={24} className="mb-2 text-fg-muted" />
              <p className="text-xs text-fg-muted">{t('kb.empty')}</p>
            </Card>
          ) : (
            <div className="space-y-1">
              {knowledgeBases.map((kb) => (
                <button
                  key={kb.id}
                  onClick={() => setSelectedKBId(kb.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    selectedKBId === kb.id
                      ? 'bg-accent-subtle text-accent'
                      : 'text-fg-secondary hover:bg-surface-hover hover:text-fg'
                  }`}
                >
                  <BookOpen size={14} className="shrink-0" />
                  <span className="truncate flex-1">{kb.name}</span>
                  <IconButton
                    label={t('common.delete')}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeKnowledgeBase(kb.id);
                      if (selectedKBId === kb.id) setSelectedKBId(null);
                    }}
                  >
                    <Trash2 size={12} />
                  </IconButton>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右侧：文档列表 */}
        <div className="min-w-0 flex-1">
          {!selectedKB ? (
            <Card className="flex flex-col items-center py-16 text-center">
              <BookOpen size={28} className="mb-3 text-fg-muted" />
              <p className="text-sm text-fg-muted">{t('kb.select_hint')}</p>
            </Card>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-fg">{selectedKB.name}</h2>
                  {selectedKB.description && (
                    <p className="mt-0.5 text-xs text-fg-muted">{selectedKB.description}</p>
                  )}
                </div>
                <Button icon={<Plus size={15} />} onClick={() => setShowAddDoc(true)}>
                  {t('kb.add_doc')}
                </Button>
              </div>

              {selectedDocs.length === 0 ? (
                <EmptyState
                  icon={<FileText size={20} />}
                  title={t('kb.doc_empty')}
                  description={t('kb.doc_empty_desc')}
                />
              ) : (
                <div className="space-y-2">
                  {selectedDocs.map((doc) => (
                    <Card key={doc.id} className="flex items-start gap-3">
                      <FileText size={15} className="mt-0.5 shrink-0 text-fg-muted" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-medium text-fg">{doc.title}</h3>
                        <p className="mt-1 text-xs text-fg-muted line-clamp-3 whitespace-pre-wrap">
                          {doc.content}
                        </p>
                      </div>
                      <IconButton
                        label={t('common.delete')}
                        size="sm"
                        onClick={() => removeKnowledgeDocument(doc.id)}
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 创建知识库 Modal */}
      <Modal
        open={showCreateKB}
        onOpenChange={setShowCreateKB}
        title={t('kb.modal.create')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateKB(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateKB}>{t('common.add')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('kb.field.name')}>
            <Input
              value={newKBName}
              onChange={(e) => setNewKBName(e.target.value)}
              placeholder={t('kb.field.name.placeholder')}
              required
            />
          </Field>
          <Field label={t('kb.field.desc')}>
            <Textarea
              value={newKBDesc}
              onChange={(e) => setNewKBDesc(e.target.value)}
              placeholder={t('kb.field.desc.placeholder')}
              rows={3}
            />
          </Field>
        </div>
      </Modal>

      {/* 添加文档 Modal */}
      <Modal
        open={showAddDoc}
        onOpenChange={setShowAddDoc}
        title={t('kb.modal.add_doc')}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddDoc(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddDoc}>{t('common.add')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={t('kb.field.doc_title')}>
            <Input
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              placeholder={t('kb.field.doc_title.placeholder')}
              required
            />
          </Field>
          <Field label={t('kb.field.doc_content')}>
            <Textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              placeholder={t('kb.field.doc_content.placeholder')}
              rows={8}
              required
            />
          </Field>
        </div>
      </Modal>
    </Page>
  );
}
