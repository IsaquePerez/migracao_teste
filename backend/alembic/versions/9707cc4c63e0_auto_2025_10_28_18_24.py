"""Auto: 2025-11-21 18:24 - Refatoracao QA Corrigida

Revision ID: 9707cc4c63e0
Revises: 
Create Date: 2025-10-28 18:24:27.049753

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '9707cc4c63e0'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # --- 1. DEFINIÇÃO DOS ENUMS ---
    # Importante: Definimos com create_type=False para que, ao serem usados 
    # dentro do op.create_table, o SQLAlchemy NÃO tente rodar o "CREATE TYPE" novamente.
    
    nivel_acesso_enum = postgresql.ENUM('admin', 'user', name='nivel_acesso_enum', create_type=False)
    status_projeto_enum = postgresql.ENUM('ativo', 'pausado', 'finalizado', name='status_projeto_enum', create_type=False)
    status_ciclo_enum = postgresql.ENUM('planejado', 'em_execucao', 'concluido', 'pausado', 'cancelado', 'erro', name='status_ciclo_enum', create_type=False)
    prioridade_enum = postgresql.ENUM('alta', 'media', 'baixa', name='prioridade_enum', create_type=False)
    tipo_metrica_enum = postgresql.ENUM('cobertura', 'eficiencia', 'defeitos', 'qualidade', 'produtividade', name='tipo_metrica_enum', create_type=False)
    status_passo_enum = postgresql.ENUM('pendente', 'aprovado', 'reprovado', 'bloqueado', name='status_passo_enum', create_type=False)
    status_execucao_enum = postgresql.ENUM('pendente', 'em_progresso', 'passou', 'falhou', 'bloqueado', name='status_execucao_enum', create_type=False)

    # --- 2. CRIAÇÃO SEGURA DOS ENUMS ---
    # Tentamos criar manualmente antes das tabelas. 
    # Se já existirem (por causa do init.sql), o erro é ignorado silenciosamente.
    all_enums = [
        nivel_acesso_enum, status_projeto_enum, status_ciclo_enum, 
        prioridade_enum, tipo_metrica_enum, status_passo_enum, status_execucao_enum
    ]

    for e in all_enums:
        try:
            e.create(bind, checkfirst=True)
        except Exception:
            # Se der erro (ex: DuplicateObjectError), significa que já existe. Ignoramos.
            pass

    # --- 3. TABELAS NÍVEL 0 ---

    op.create_table('niveis_acesso',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', nivel_acesso_enum, nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('permissoes', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_niveis_acesso_id'), 'niveis_acesso', ['id'], unique=False)

    op.create_table('sistemas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sistemas_id'), 'sistemas', ['id'], unique=False)

    # --- 4. TABELAS NÍVEL 1 ---

    op.create_table('usuarios',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('senha_hash', sa.String(length=255), nullable=False),
        sa.Column('nivel_acesso_id', sa.Integer(), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['nivel_acesso_id'], ['niveis_acesso.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usuarios_email'), 'usuarios', ['email'], unique=True)
    op.create_index(op.f('ix_usuarios_id'), 'usuarios', ['id'], unique=False)

    op.create_table('modulos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sistema_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('ordem', sa.Integer(), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['sistema_id'], ['sistemas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_modulos_id'), 'modulos', ['id'], unique=False)

    # --- 5. TABELAS NÍVEL 2 ---

    op.create_table('projetos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('modulo_id', sa.Integer(), nullable=False),
        sa.Column('sistema_id', sa.Integer(), nullable=False),
        sa.Column('responsavel_id', sa.Integer(), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('status', status_projeto_enum, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['modulo_id'], ['modulos.id'], ),
        sa.ForeignKeyConstraint(['responsavel_id'], ['usuarios.id'], ),
        sa.ForeignKeyConstraint(['sistema_id'], ['sistemas.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projetos_id'), 'projetos', ['id'], unique=False)

    # --- 6. TABELAS NÍVEL 3 (QA) ---

    op.create_table('ciclos_teste',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('projeto_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(), nullable=True),
        sa.Column('numero', sa.Integer(), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('data_inicio', sa.DateTime(timezone=True), nullable=True),
        sa.Column('data_fim', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', status_ciclo_enum, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['projeto_id'], ['projetos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ciclos_teste_id'), 'ciclos_teste', ['id'], unique=False)

    op.create_table('casos_teste',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('projeto_id', sa.Integer(), nullable=False),
        sa.Column('nome', sa.String(length=255), nullable=False),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('pre_condicoes', sa.Text(), nullable=True),
        sa.Column('prioridade', prioridade_enum, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['projeto_id'], ['projetos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_casos_teste_id'), 'casos_teste', ['id'], unique=False)

    # --- 7. TABELAS NÍVEL 4 ---

    op.create_table('passos_caso_teste',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('caso_teste_id', sa.Integer(), nullable=False),
        sa.Column('ordem', sa.Integer(), nullable=False),
        sa.Column('acao', sa.Text(), nullable=False),
        sa.Column('resultado_esperado', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['caso_teste_id'], ['casos_teste.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_passos_caso_teste_id'), 'passos_caso_teste', ['id'], unique=False)

    op.create_table('execucoes_teste',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ciclo_teste_id', sa.Integer(), nullable=False),
        sa.Column('caso_teste_id', sa.Integer(), nullable=False),
        sa.Column('responsavel_id', sa.Integer(), nullable=True),
        sa.Column('status_geral', status_execucao_enum, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['caso_teste_id'], ['casos_teste.id'], ),
        sa.ForeignKeyConstraint(['ciclo_teste_id'], ['ciclos_teste.id'], ),
        sa.ForeignKeyConstraint(['responsavel_id'], ['usuarios.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_execucoes_teste_id'), 'execucoes_teste', ['id'], unique=False)

    # --- 8. TABELAS NÍVEL 5 ---

    op.create_table('execucoes_passos',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('execucao_teste_id', sa.Integer(), nullable=False),
        sa.Column('passo_caso_teste_id', sa.Integer(), nullable=False),
        sa.Column('resultado_obtido', sa.Text(), nullable=True),
        sa.Column('status', status_passo_enum, nullable=True),
        sa.Column('evidencias', sa.Text(), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['execucao_teste_id'], ['execucoes_teste.id'], ),
        sa.ForeignKeyConstraint(['passo_caso_teste_id'], ['passos_caso_teste.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_execucoes_passos_id'), 'execucoes_passos', ['id'], unique=False)

    op.create_table('metricas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('projeto_id', sa.Integer(), nullable=False),
        sa.Column('ciclo_teste_id', sa.Integer(), nullable=True),
        sa.Column('tipo_metrica', tipo_metrica_enum, nullable=False),
        sa.Column('casos_reprovados', sa.Integer(), nullable=False),
        sa.Column('casos_executados', sa.Integer(), nullable=False),
        sa.Column('casos_aprovados', sa.Integer(), nullable=False),
        sa.Column('tempo_medio_resolucao', sa.Integer(), nullable=True),
        sa.Column('data_medicao', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('nome_metrica', sa.String(length=255), nullable=False),
        sa.Column('valor_metrica', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unidade_medida', sa.String(length=255), nullable=True),
        sa.Column('descricao', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['ciclo_teste_id'], ['ciclos_teste.id'], ),
        sa.ForeignKeyConstraint(['projeto_id'], ['projetos.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_metricas_id'), 'metricas', ['id'], unique=False)


def downgrade() -> None:
    # No Downgrade, dropamos na ordem inversa
    op.drop_index(op.f('ix_metricas_id'), table_name='metricas')
    op.drop_table('metricas')
    
    op.drop_index(op.f('ix_execucoes_passos_id'), table_name='execucoes_passos')
    op.drop_table('execucoes_passos')
    
    op.drop_index(op.f('ix_execucoes_teste_id'), table_name='execucoes_teste')
    op.drop_table('execucoes_teste')
    
    op.drop_index(op.f('ix_passos_caso_teste_id'), table_name='passos_caso_teste')
    op.drop_table('passos_caso_teste')
    
    op.drop_index(op.f('ix_casos_teste_id'), table_name='casos_teste')
    op.drop_table('casos_teste')
    
    op.drop_index(op.f('ix_ciclos_teste_id'), table_name='ciclos_teste')
    op.drop_table('ciclos_teste')
    
    op.drop_index(op.f('ix_projetos_id'), table_name='projetos')
    op.drop_table('projetos')
    
    op.drop_index(op.f('ix_modulos_id'), table_name='modulos')
    op.drop_table('modulos')
    
    op.drop_index(op.f('ix_usuarios_id'), table_name='usuarios')
    op.drop_index(op.f('ix_usuarios_email'), table_name='usuarios')
    op.drop_table('usuarios')
    
    op.drop_index(op.f('ix_sistemas_id'), table_name='sistemas')
    op.drop_table('sistemas')
    
    op.drop_index(op.f('ix_niveis_acesso_id'), table_name='niveis_acesso')
    op.drop_table('niveis_acesso')
    
    # Não deletamos os Enums automaticamente no downgrade para evitar problemas em bases compartilhadas