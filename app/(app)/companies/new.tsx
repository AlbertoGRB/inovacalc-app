import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconChevronLeft } from '@tabler/icons-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOutbox, makeLocalId } from '@/stores/outboxStore';
import { flushOutbox, isNetworkError } from '@/lib/sync';
import { maskPhone } from '@/lib/format';import { colors, typography, radius } from '@/theme';

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

const RISK_GRADES = [1, 2, 3, 4];
const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

export default function NewCompanyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { redirectTo, editId } = useLocalSearchParams<{ redirectTo?: string; editId?: string }>();
  const isEditing = !!editId;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('SP');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [sector, setSector] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [riskGrade, setRiskGrade] = useState<number>(1);

  // Pré-carrega dados quando estiver editando
  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('companies').select('*').eq('id', editId).single();
        if (error) throw error;
        if (cancelled || !data) return;
        setCompanyName(data.company_name ?? '');
        setTradeName(data.trade_name ?? '');
        setCnpj(data.cnpj ? maskCNPJ(data.cnpj) : '');
        setContactName(data.contact_name ?? '');
        setContactRole(data.contact_role ?? '');
        setEmail(data.email ?? '');
        setPhone(data.phone ? maskPhone(data.phone) : '');
        setCity(data.city ?? '');
        setState(data.state ?? 'SP');
        setZipCode(data.zip_code ? maskCEP(data.zip_code) : '');
        setAddress(data.address ?? '');
        setSector(data.sector ?? '');
        setEmployeeCount(data.employee_count ? String(data.employee_count) : '');
        setRiskGrade(data.risk_grade ?? 1);
      } catch {
        Alert.alert('Erro', 'Não foi possível carregar os dados da empresa.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [editId]);

  async function handleSave() {
    if (!companyName.trim()) {
      Alert.alert('Campo obrigatório', 'Informe o nome da empresa.');
      return;
    }

    setSaving(true);
    try {
      const cnpjDigits = cnpj.replace(/\D/g, '');
      const phoneDigits = phone.replace(/\D/g, '');
      const zipDigits = zipCode.replace(/\D/g, '');
      const employees = parseInt(employeeCount);

      const payload = {
        company_name: companyName.trim(),
        trade_name: tradeName.trim() || null,
        cnpj: cnpjDigits || null,
        contact_name: contactName.trim() || null,
        contact_role: contactRole.trim() || null,
        email: email.trim() || null,
        phone: phoneDigits || null,
        city: city.trim() || null,
        state: state.trim() || null,
        zip_code: zipDigits || null,
        address: address.trim() || null,
        sector: sector.trim() || null,
        employee_count: Number.isFinite(employees) && employees > 0 ? employees : null,
        risk_grade: riskGrade,
      };

      if (isEditing) {
        const updatePayload = { ...payload, updated_at: new Date().toISOString() };
        try {
          const { error } = await supabase
            .from('companies')
            .update(updatePayload)
            .eq('id', editId!);
          if (error) throw error;
        } catch (e: any) {
          // Offline ou erro de rede — enfileira para sincronizar depois
          if (isNetworkError(e)) {
            useOutbox.getState().enqueue({
              type: 'company.update',
              recordId: editId!,
              payload: updatePayload,
            });
          } else {
            throw e;
          }
        }

        await queryClient.invalidateQueries({ queryKey: ['companies'] });
        await queryClient.invalidateQueries({ queryKey: ['company', editId] });
        router.back();
        return;
      }

      // Criação — tenta online; se falhar por rede, enfileira com tempId.
      const createPayload = {
        ...payload,
        status: 'PROSPECT',
        created_by: user?.id ?? null,
      };

      let newId: string | null = null;
      try {
        const { data, error } = await supabase
          .from('companies')
          .insert(createPayload)
          .select('id')
          .single();
        if (error) throw error;
        newId = data?.id ?? null;
      } catch (e: any) {
        if (isNetworkError(e)) {
          const tempId = makeLocalId();
          useOutbox.getState().enqueue({
            type: 'company.create',
            tempId,
            payload: createPayload,
          });
          newId = tempId;
        } else {
          throw e;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      // Tenta sincronizar imediatamente (não bloqueia o fluxo)
      flushOutbox().catch(() => {});

      if (redirectTo && newId) {
        router.replace(`/${redirectTo}?companyId=${newId}`);
      } else {
        router.back();
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar empresa.';
      Alert.alert('Erro', msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.neutral.gray50 }}>
      {/* Header */}
      <View style={{
        backgroundColor: colors.primary[900],
        paddingTop: insets.top + 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconChevronLeft size={16} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.sm, color: 'rgba(255,255,255,0.8)' }}>Voltar</Text>
        </TouchableOpacity>
        <Text style={{ fontFamily: 'Inter_500Medium', fontSize: typography.sizes.xl, color: colors.neutral.white }}>
          {isEditing ? 'Editar Empresa' : 'Nova Empresa'}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator color={colors.primary[600]} />
          </View>
        )}
        {!loading && (
        <>
        {/* Dados da empresa */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Dados da Empresa
        </Text>

        <Text className="mb-1 text-sm font-medium text-slate-700">Nome da empresa *</Text>
        <TextInput
          value={companyName}
          onChangeText={setCompanyName}
          placeholder="Razão social ou nome"
          placeholderTextColor="#94a3b8"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">Nome Fantasia</Text>
        <TextInput
          value={tradeName}
          onChangeText={setTradeName}
          placeholder="Opcional"
          placeholderTextColor="#94a3b8"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">CNPJ</Text>
        <TextInput
          value={cnpj}
          onChangeText={t => setCnpj(maskCNPJ(t))}
          placeholder="00.000.000/0001-00"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">Setor / Ramo de Atividade</Text>
        <TextInput
          value={sector}
          onChangeText={setSector}
          placeholder="Ex: Construção Civil, Indústria..."
          placeholderTextColor="#94a3b8"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        {/* Grau de risco */}
        <Text className="mb-2 text-sm font-medium text-slate-700">Grau de Risco</Text>
        <View className="mb-4 flex-row gap-2">
          {RISK_GRADES.map(g => (
            <TouchableOpacity
              key={g}
              onPress={() => setRiskGrade(g)}
              className={`flex-1 items-center rounded-xl border py-3 ${
                riskGrade === g
                  ? 'border-brand-600 bg-brand-600'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text className={`text-base font-bold ${riskGrade === g ? 'text-white' : 'text-slate-700'}`}>
                G{g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="mb-1 text-sm font-medium text-slate-700">Nº de Funcionários</Text>
        <TextInput
          value={employeeCount}
          onChangeText={setEmployeeCount}
          placeholder="0"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        {/* Contato */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contato
        </Text>

        <Text className="mb-1 text-sm font-medium text-slate-700">Nome do Contato</Text>
        <TextInput
          value={contactName}
          onChangeText={setContactName}
          placeholder="Responsável pelo contato"
          placeholderTextColor="#94a3b8"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">Cargo</Text>
        <TextInput
          value={contactRole}
          onChangeText={setContactRole}
          placeholder="Ex: Gerente, Diretor..."
          placeholderTextColor="#94a3b8"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">E-mail</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="contato@empresa.com"
          placeholderTextColor="#94a3b8"
          keyboardType="email-address"
          autoCapitalize="none"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">Telefone</Text>
        <TextInput
          value={phone}
          onChangeText={t => setPhone(maskPhone(t))}
          placeholder="(00) 00000-0000"
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        {/* Endereço */}
        <Text className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Endereço
        </Text>

        <Text className="mb-1 text-sm font-medium text-slate-700">CEP</Text>
        <TextInput
          value={zipCode}
          onChangeText={t => setZipCode(maskCEP(t))}
          placeholder="00000-000"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <Text className="mb-1 text-sm font-medium text-slate-700">Endereço</Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Rua, número, complemento"
          placeholderTextColor="#94a3b8"
          className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
        />

        <View className="mb-6 flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-slate-700">Cidade</Text>
            <TextInput
              value={city}
              onChangeText={setCity}
              placeholder="Cidade"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900"
            />
          </View>
          <View style={{ width: 80 }}>
            <Text className="mb-1 text-sm font-medium text-slate-700">UF</Text>
            <TextInput
              value={state}
              onChangeText={t => setState(t.toUpperCase().slice(0, 2))}
              placeholder="SP"
              placeholderTextColor="#94a3b8"
              autoCapitalize="characters"
              maxLength={2}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 text-center"
            />
          </View>
        </View>

        {/* Botão salvar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="items-center rounded-2xl bg-brand-600 py-4 active:opacity-85"
          style={{ opacity: saving ? 0.6 : 1 }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-bold text-white">
              {isEditing ? 'Salvar Alterações' : (redirectTo ? 'Salvar e Gerar Orçamento' : 'Salvar Empresa')}
            </Text>
          )}
        </TouchableOpacity>
        </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
