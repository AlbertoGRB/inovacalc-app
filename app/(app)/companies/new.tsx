import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useNavigation } from 'expo-router';
import { IconChevronLeft, IconSearch } from '@tabler/icons-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { useOutbox, makeLocalId } from '@/stores/outboxStore';
import { useQuoteDraft } from '@/stores/quoteDraftStore';
import { flushOutbox, isNetworkError } from '@/lib/sync';
import { maskPhone } from '@/lib/format';
import { fetchAddressByCEP } from '@/lib/viacep';
import { fetchCNPJData } from '@/lib/opencnpj';
import { createClickUpCompany, updateClickUpCompany } from '@/lib/clickup';
import { colors, typography, radius } from '@/theme';

type DocType = 'cnpj' | 'cpf';

function maskCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, '$1-$2');
}

const RISK_GRADES = [1, 2, 3, 4];

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputStyle = {
  backgroundColor: colors.neutral.white,
  borderRadius: radius.lg,
  borderWidth: 0.5,
  borderColor: colors.neutral.gray200,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontFamily: 'Inter_400Regular' as const,
  fontSize: typography.sizes.md,
  color: colors.neutral.gray900,
  marginBottom: 16,
};

const labelStyle = {
  fontFamily: 'Inter_500Medium' as const,
  fontSize: typography.sizes.sm,
  color: colors.neutral.gray700,
  marginBottom: 4,
};

const sectionStyle = {
  fontFamily: 'Inter_500Medium' as const,
  fontSize: typography.sizes.xs,
  color: colors.neutral.gray500,
  letterSpacing: 0.5,
  textTransform: 'uppercase' as const,
  marginBottom: 12,
};

export default function NewCompanyScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { redirectTo, editId } = useLocalSearchParams<{ redirectTo?: string; editId?: string }>();
  const isEditing = !!editId;
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const safeGoBack = () => {
    if (navigation.canGoBack()) {
      router.back();
    } else {
      router.replace('/companies' as any);
    }
  };

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  const [docType, setDocType] = useState<DocType>('cnpj');
  const [companyName, setCompanyName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [cpf, setCpf] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Frutal');
  const [state, setState] = useState('MG');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [sector, setSector] = useState('');
  const [employeeCount, setEmployeeCount] = useState('');
  const [riskGrade, setRiskGrade] = useState<number>(1);
  const [cepLoading, setCepLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);

  // CEP auto-lookup
  useEffect(() => {
    const digits = zipCode.replace(/\D/g, '');
    if (digits.length !== 8) return;

    let cancelled = false;
    setCepLoading(true);
    fetchAddressByCEP(digits).then(result => {
      if (cancelled || !result) return;
      if (result.address) setAddress(result.address);
      if (result.city) setCity(result.city);
      if (result.state) setState(result.state);
    }).finally(() => {
      if (!cancelled) setCepLoading(false);
    });
    return () => { cancelled = true; };
  }, [zipCode]);

  // CNPJ auto-lookup: check local DB first, then OpenCNPJ API
  async function handleCnpjLookup() {
    const digits = cnpj.replace(/\D/g, '');
    if (digits.length !== 14) {
      Alert.alert('CNPJ incompleto', 'Digite os 14 dígitos do CNPJ.');
      return;
    }

    setCnpjLoading(true);
    try {
      // 1. Check if a company with this CNPJ already exists in DB
      const { data: existing } = await supabase
        .from('companies')
        .select('id, company_name')
        .eq('cnpj', digits)
        .maybeSingle();

      if (existing && existing.id !== editId) {
        // Company already exists — ask user to use existing one
        Alert.alert(
          'Empresa já cadastrada',
          `"${existing.company_name}" já possui este CNPJ.\nDeseja abrir a empresa existente?`,
          [
            { text: 'Não, continuar aqui', style: 'cancel' },
            {
              text: 'Abrir empresa',
              onPress: () => {
                if (redirectTo) {
                  // In quote wizard: set existing company and continue
                  supabase.from('companies').select('*').eq('id', existing.id).single()
                    .then(({ data }) => {
                      if (data) {
                        useQuoteDraft.getState().setCompany(data);
                        router.replace('/quote/what-include' as any);
                      }
                    });
                } else {
                  router.replace(`/companies/${existing.id}` as any);
                }
              },
            },
          ],
        );
        return;
      }

      // 2. Not in DB — fetch from OpenCNPJ API
      const result = await fetchCNPJData(digits);
      if (!result) {
        Alert.alert('CNPJ não encontrado', 'Verifique o número e tente novamente.');
        return;
      }

      if (result.razaoSocial && !companyName) setCompanyName(result.razaoSocial);
      if (result.nomeFantasia && !tradeName) setTradeName(result.nomeFantasia);
      if (result.uf) setState(result.uf);
      if (result.municipio) {
        setCity(result.municipio.split(' ').map(w =>
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' '));
      }
      // Populate sector from CNAE
      if (result.cnae) {
        const cnaeLabel = result.cnaeDescricao
          ? `${result.cnaeDescricao} (${result.cnae})`
          : result.cnae;
        setSector(cnaeLabel);
      }

      const info = [
        `Situação: ${result.situacao}`,
        result.porte ? `Porte: ${result.porte}` : '',
        result.cnae ? `CNAE: ${result.cnaeDescricao || result.cnae}` : '',
      ].filter(Boolean).join('\n');
      Alert.alert('Dados carregados', info);
    } catch {
      Alert.alert('Erro', 'Não foi possível consultar o CNPJ. Tente novamente.');
    } finally {
      setCnpjLoading(false);
    }
  }

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
        setCpf(data.cpf ? maskCPF(data.cpf) : '');
        // Detect docType based on existing data
        if (data.cpf && !data.cnpj) setDocType('cpf');
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
      const cpfDigits = cpf.replace(/\D/g, '');
      const phoneDigits = phone.replace(/\D/g, '');
      const zipDigits = zipCode.replace(/\D/g, '');
      const employees = parseInt(employeeCount);

      const payload: Record<string, any> = {
        company_name: companyName.trim(),
        trade_name: tradeName.trim() || '',
        cnpj: docType === 'cnpj' ? (cnpjDigits || '') : '',
        cpf: docType === 'cpf' ? (cpfDigits || '') : null,
        contact_name: contactName.trim() || '',
        contact_role: contactRole.trim() || '',
        email: email.trim() || '',
        phone: phoneDigits || '',
        city: city.trim() || '',
        state: state.trim() || '',
        zip_code: zipDigits || '',
        address: address.trim() || '',
        sector: sector.trim() || '',
        employee_count: Number.isFinite(employees) && employees > 0 ? employees : 0,
        risk_grade: riskGrade,
      };

      if (isEditing) {
        payload.updated_at = new Date().toISOString();
        try {
          const { error } = await supabase
            .from('companies')
            .update(payload)
            .eq('id', editId!);
          if (error) throw error;
        } catch (e: any) {
          if (isNetworkError(e)) {
            useOutbox.getState().enqueue({
              type: 'company.update',
              recordId: editId!,
              payload,
            });
          } else {
            throw e;
          }
        }

        // Sync with ClickUp (fire-and-forget)
        Promise.resolve(
          supabase.from('companies').select('clickup_task_id').eq('id', editId!).single()
        ).then(({ data: row }) => {
          if (row?.clickup_task_id) {
            updateClickUpCompany(row.clickup_task_id, payload as any);
          }
        }).catch(() => {});

        await queryClient.invalidateQueries({ queryKey: ['companies'] });
        await queryClient.invalidateQueries({ queryKey: ['company', editId] });
        safeGoBack();
        return;
      }

      // Criação
      const createPayload = {
        ...payload,
        status: 'PROSPECT' as const,
        created_by: user?.id ?? null,
      };

      let newCompany: any = null;
      try {
        const { data, error } = await supabase
          .from('companies')
          .insert(createPayload)
          .select('*')
          .single();
        if (error) throw error;
        newCompany = data;
      } catch (e: any) {
        if (isNetworkError(e)) {
          const tempId = makeLocalId();
          useOutbox.getState().enqueue({
            type: 'company.create',
            tempId,
            payload: createPayload,
          });
          newCompany = { ...createPayload, id: tempId };
        } else {
          throw e;
        }
      }

      // Sync with ClickUp (fire-and-forget — doesn't block the user)
      if (newCompany?.id && !newCompany.id.startsWith('local_')) {
        createClickUpCompany(payload as any).then(taskId => {
          if (taskId) {
            supabase.from('companies')
              .update({ clickup_task_id: taskId })
              .eq('id', newCompany.id)
              .then(() => {});
          }
        }).catch(() => {});
      }

      await queryClient.invalidateQueries({ queryKey: ['companies'] });
      flushOutbox().catch(() => {});

      if (redirectTo && newCompany) {
        useQuoteDraft.getState().setCompany(newCompany);
        router.replace('/quote/what-include' as any);
        return;
      }
      safeGoBack();
    } catch (e: any) {
      const msg = e?.message
        ?? e?.error_description
        ?? e?.details
        ?? e?.hint
        ?? (typeof e === 'object' ? JSON.stringify(e) : String(e));
      Alert.alert('Erro ao salvar', msg);
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
          onPress={safeGoBack}
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
              <Text style={sectionStyle}>Dados da Empresa</Text>

              <Text style={labelStyle}>Nome da empresa *</Text>
              <TextInput
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Razão social ou nome"
                placeholderTextColor={colors.neutral.gray400}
                style={inputStyle}
              />

              <Text style={labelStyle}>Nome Fantasia</Text>
              <TextInput
                value={tradeName}
                onChangeText={setTradeName}
                placeholder="Opcional"
                placeholderTextColor={colors.neutral.gray400}
                style={inputStyle}
              />

              {/* Doc type toggle: CNPJ / CPF */}
              <Text style={[labelStyle, { marginBottom: 8 }]}>Tipo de Documento</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {(['cnpj', 'cpf'] as DocType[]).map(dt => (
                  <TouchableOpacity
                    key={dt}
                    onPress={() => setDocType(dt)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 10,
                      borderRadius: radius.lg,
                      borderWidth: 0.5,
                      borderColor: docType === dt ? colors.primary[600] : colors.neutral.gray200,
                      backgroundColor: docType === dt ? colors.primary[600] : colors.neutral.white,
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: typography.sizes.md,
                      color: docType === dt ? colors.neutral.white : colors.neutral.gray700,
                    }}>{dt.toUpperCase()}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {docType === 'cnpj' ? (
                <>
                  <Text style={labelStyle}>CNPJ</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={cnpj}
                      onChangeText={t => setCnpj(maskCNPJ(t))}
                      placeholder="00.000.000/0001-00"
                      placeholderTextColor={colors.neutral.gray400}
                      keyboardType="numeric"
                      style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                    />
                    <TouchableOpacity
                      onPress={handleCnpjLookup}
                      disabled={cnpjLoading}
                      activeOpacity={0.7}
                      style={{
                        width: 44, height: 44, borderRadius: radius.lg,
                        backgroundColor: colors.primary[600],
                        alignItems: 'center', justifyContent: 'center',
                        opacity: cnpjLoading ? 0.6 : 1,
                      }}
                    >
                      {cnpjLoading ? (
                        <ActivityIndicator size="small" color={colors.neutral.white} />
                      ) : (
                        <IconSearch size={18} color={colors.neutral.white} strokeWidth={2} />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={{
                    fontFamily: 'Inter_400Regular',
                    fontSize: typography.sizes.xs,
                    color: colors.neutral.gray400,
                    marginTop: 4,
                    marginBottom: 16,
                  }}>Toque na lupa para buscar dados automaticamente</Text>
                </>
              ) : (
                <>
                  <Text style={labelStyle}>CPF</Text>
                  <TextInput
                    value={cpf}
                    onChangeText={t => setCpf(maskCPF(t))}
                    placeholder="000.000.000-00"
                    placeholderTextColor={colors.neutral.gray400}
                    keyboardType="numeric"
                    style={inputStyle}
                  />
                </>
              )}

              <Text style={labelStyle}>Setor / Ramo de Atividade</Text>
              <TextInput
                value={sector}
                onChangeText={setSector}
                placeholder="Ex: Construção Civil, Agropecuária..."
                placeholderTextColor={colors.neutral.gray400}
                style={inputStyle}
              />

              {/* Grau de risco */}
              <Text style={[labelStyle, { marginBottom: 8 }]}>Grau de Risco</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {RISK_GRADES.map(g => (
                  <TouchableOpacity
                    key={g}
                    onPress={() => setRiskGrade(g)}
                    activeOpacity={0.7}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 12,
                      borderRadius: radius.lg,
                      borderWidth: 0.5,
                      borderColor: riskGrade === g ? colors.primary[600] : colors.neutral.gray200,
                      backgroundColor: riskGrade === g ? colors.primary[600] : colors.neutral.white,
                    }}
                  >
                    <Text style={{
                      fontFamily: 'Inter_500Medium',
                      fontSize: typography.sizes.md,
                      color: riskGrade === g ? colors.neutral.white : colors.neutral.gray700,
                    }}>G{g}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={labelStyle}>N° de Funcionários</Text>
              <TextInput
                value={employeeCount}
                onChangeText={setEmployeeCount}
                placeholder="0"
                placeholderTextColor={colors.neutral.gray400}
                keyboardType="numeric"
                style={[inputStyle, { marginBottom: 24 }]}
              />

              {/* Contato */}
              <Text style={sectionStyle}>Contato</Text>

              <Text style={labelStyle}>Nome do Contato</Text>
              <TextInput
                value={contactName}
                onChangeText={setContactName}
                placeholder="Responsável pelo contato"
                placeholderTextColor={colors.neutral.gray400}
                style={inputStyle}
              />

              <Text style={labelStyle}>Cargo</Text>
              <TextInput
                value={contactRole}
                onChangeText={setContactRole}
                placeholder="Ex: Gerente, Diretor..."
                placeholderTextColor={colors.neutral.gray400}
                style={inputStyle}
              />

              <Text style={labelStyle}>E-mail</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="contato@empresa.com"
                placeholderTextColor={colors.neutral.gray400}
                keyboardType="email-address"
                autoCapitalize="none"
                style={inputStyle}
              />

              <Text style={labelStyle}>Telefone</Text>
              <TextInput
                value={phone}
                onChangeText={t => setPhone(maskPhone(t))}
                placeholder="(00) 00000-0000"
                placeholderTextColor={colors.neutral.gray400}
                keyboardType="phone-pad"
                style={[inputStyle, { marginBottom: 24 }]}
              />

              {/* Endereço */}
              <Text style={sectionStyle}>Endereço</Text>

              <Text style={labelStyle}>CEP</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  value={zipCode}
                  onChangeText={t => setZipCode(maskCEP(t))}
                  placeholder="00000-000"
                  placeholderTextColor={colors.neutral.gray400}
                  keyboardType="numeric"
                  style={[inputStyle, { flex: 1, marginBottom: 0 }]}
                />
                {cepLoading && <ActivityIndicator size="small" color={colors.primary[600]} />}
              </View>
              <View style={{ height: 16 }} />

              <Text style={labelStyle}>Endereço</Text>
              <TextInput
                value={address}
                onChangeText={setAddress}
                placeholder="Rua, número, complemento"
                placeholderTextColor={colors.neutral.gray400}
                style={inputStyle}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                <View style={{ flex: 1 }}>
                  <Text style={labelStyle}>Cidade</Text>
                  <TextInput
                    value={city}
                    onChangeText={setCity}
                    placeholder="Cidade"
                    placeholderTextColor={colors.neutral.gray400}
                    style={[inputStyle, { marginBottom: 0 }]}
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text style={labelStyle}>UF</Text>
                  <TextInput
                    value={state}
                    onChangeText={t => setState(t.toUpperCase().slice(0, 2))}
                    placeholder="SP"
                    placeholderTextColor={colors.neutral.gray400}
                    autoCapitalize="characters"
                    maxLength={2}
                    style={[inputStyle, { marginBottom: 0, textAlign: 'center' }]}
                  />
                </View>
              </View>

              {/* Botão salvar */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
                style={{
                  alignItems: 'center',
                  borderRadius: radius.xl,
                  backgroundColor: colors.primary[600],
                  paddingVertical: 16,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? (
                  <ActivityIndicator color={colors.neutral.white} />
                ) : (
                  <Text style={{
                    fontFamily: 'Inter_500Medium',
                    fontSize: typography.sizes.md,
                    color: colors.neutral.white,
                  }}>
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
