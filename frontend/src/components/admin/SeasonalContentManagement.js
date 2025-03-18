import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { 
  Card, Button, ActivityIndicator, TextInput, 
  Chip, Modal, Portal, Divider, Switch, FAB 
} from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  getSeasonalPromotions, 
  createSeasonalPromotion, 
  updateSeasonalPromotion, 
  deleteSeasonalPromotion,
  generateAutomaticSeasonalPromotion,
  getPromotionEffectiveness
} from '../../services/api';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

const SeasonalContentManagement = () => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [effectivenessModalVisible, setEffectivenessModalVisible] = useState(false);
  const [currentPromotion, setCurrentPromotion] = useState(null);
  const [promotionEffectiveness, setPromotionEffectiveness] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    isActive: true,
    priority: 50,
    boostedTags: [],
    boostedContentTypes: [],
    globalBoostFactor: 1.5,
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [contentTypeInput, setContentTypeInput] = useState('');
  const { theme } = useTheme();

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    try {
      setLoading(true);
      const response = await getSeasonalPromotions();
      setPromotions(response.data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching seasonal promotions:', err);
      setError('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const fetchEffectiveness = async () => {
    try {
      setLoading(true);
      const response = await getPromotionEffectiveness();
      setPromotionEffectiveness(response.data || []);
      setEffectivenessModalVisible(true);
    } catch (err) {
      console.error('Error fetching promotion effectiveness:', err);
      Alert.alert('Error', 'Failed to load promotion effectiveness data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromotion = async () => {
    try {
      setLoading(true);
      await createSeasonalPromotion(formData);
      setModalVisible(false);
      resetForm();
      fetchPromotions();
      Alert.alert('Success', 'Seasonal promotion created successfully');
    } catch (err) {
      console.error('Error creating promotion:', err);
      Alert.alert('Error', 'Failed to create promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePromotion = async () => {
    try {
      setLoading(true);
      await updateSeasonalPromotion(currentPromotion._id, formData);
      setModalVisible(false);
      resetForm();
      fetchPromotions();
      Alert.alert('Success', 'Seasonal promotion updated successfully');
    } catch (err) {
      console.error('Error updating promotion:', err);
      Alert.alert('Error', 'Failed to update promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePromotion = async (promotionId) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this promotion? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteSeasonalPromotion(promotionId);
              fetchPromotions();
              Alert.alert('Success', 'Promotion deleted successfully');
            } catch (err) {
              console.error('Error deleting promotion:', err);
              Alert.alert('Error', 'Failed to delete promotion');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleAutoGenerate = async () => {
    try {
      setLoading(true);
      const response = await generateAutomaticSeasonalPromotion();
      fetchPromotions();
      Alert.alert('Success', `Automatic seasonal promotion "${response.data.name}" created successfully`);
    } catch (err) {
      console.error('Error generating automatic promotion:', err);
      Alert.alert('Error', 'Failed to generate automatic promotion');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setCurrentPromotion(null);
    setModalVisible(true);
  };

  const openEditModal = (promotion) => {
    setCurrentPromotion(promotion);
    setFormData({
      name: promotion.name || '',
      description: promotion.description || '',
      startDate: new Date(promotion.startDate) || new Date(),
      endDate: new Date(promotion.endDate) || new Date(),
      isActive: promotion.isActive || false,
      priority: promotion.priority || 50,
      boostedTags: promotion.boostedTags || [],
      boostedContentTypes: promotion.boostedContentTypes || [],
      globalBoostFactor: promotion.globalBoostFactor || 1.5,
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      isActive: true,
      priority: 50,
      boostedTags: [],
      boostedContentTypes: [],
      globalBoostFactor: 1.5,
    });
    setTagInput('');
    setContentTypeInput('');
  };

  const addTag = () => {
    if (tagInput.trim() !== '' && !formData.boostedTags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        boostedTags: [...formData.boostedTags, tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({
      ...formData,
      boostedTags: formData.boostedTags.filter(t => t !== tag)
    });
  };

  const addContentType = () => {
    if (contentTypeInput.trim() !== '' && !formData.boostedContentTypes.includes(contentTypeInput.trim())) {
      setFormData({
        ...formData,
        boostedContentTypes: [...formData.boostedContentTypes, contentTypeInput.trim()]
      });
      setContentTypeInput('');
    }
  };

  const removeContentType = (type) => {
    setFormData({
      ...formData,
      boostedContentTypes: formData.boostedContentTypes.filter(t => t !== type)
    });
  };

  const renderPromotionItem = ({ item }) => {
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const isActive = new Date() >= startDate && new Date() <= endDate && item.isActive;

    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.promotionName}>{item.name}</Text>
            <Chip 
              mode="outlined" 
              style={[
                styles.statusChip, 
                { borderColor: isActive ? theme.colors.success : theme.colors.error }
              ]}
              textStyle={{ 
                color: isActive ? theme.colors.success : theme.colors.error 
              }}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Chip>
          </View>

          <Text style={styles.description}>{item.description}</Text>
          
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>Start: </Text>
            <Text style={styles.dateValue}>{format(startDate, 'MMM d, yyyy')}</Text>
            <Text style={styles.dateLabel}>End: </Text>
            <Text style={styles.dateValue}>{format(endDate, 'MMM d, yyyy')}</Text>
          </View>
          
          <View style={styles.priorityRow}>
            <Text style={styles.priorityLabel}>Priority: </Text>
            <Text style={styles.priorityValue}>{item.priority}</Text>
            <Text style={styles.boostLabel}>Boost: </Text>
            <Text style={styles.boostValue}>{item.globalBoostFactor}x</Text>
          </View>
          
          {item.boostedTags && item.boostedTags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Boosted Tags:</Text>
              <View style={styles.tagsContainer}>
                {item.boostedTags.slice(0, 5).map((tag, index) => (
                  <Chip key={index} style={styles.tag} textStyle={{ fontSize: 12 }}>
                    {tag}
                  </Chip>
                ))}
                {item.boostedTags.length > 5 && (
                  <Chip style={styles.tag} textStyle={{ fontSize: 12 }}>
                    +{item.boostedTags.length - 5} more
                  </Chip>
                )}
              </View>
            </View>
          )}
          
          {item.boostedContentTypes && item.boostedContentTypes.length > 0 && (
            <View style={styles.tagsSection}>
              <Text style={styles.sectionTitle}>Boosted Content Types:</Text>
              <View style={styles.tagsContainer}>
                {item.boostedContentTypes.map((type, index) => (
                  <Chip key={index} style={styles.contentTypeChip} textStyle={{ fontSize: 12 }}>
                    {type}
                  </Chip>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
        
        <Card.Actions style={styles.cardActions}>
          <Button 
            mode="outlined" 
            onPress={() => openEditModal(item)}
            icon="pencil"
          >
            Edit
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => handleDeletePromotion(item._id)}
            icon="delete"
            textColor={theme.colors.error}
          >
            Delete
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  if (loading && promotions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading seasonal promotions...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Seasonal Content Management</Text>
        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            onPress={fetchEffectiveness}
            icon="chart-bar"
            style={styles.effectivenessButton}
          >
            Effectiveness
          </Button>
          <Button 
            mode="contained" 
            onPress={handleAutoGenerate}
            icon="magic-staff"
            style={styles.generateButton}
          >
            Auto Generate
          </Button>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchPromotions}>
            Retry
          </Button>
        </View>
      ) : (
        <FlatList
          data={promotions}
          renderItem={renderPromotionItem}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No seasonal promotions found. Create a new promotion to get started.
              </Text>
            </View>
          }
        />
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={openCreateModal}
        color="#fff"
      />

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>
            {currentPromotion ? 'Edit Seasonal Promotion' : 'Create Seasonal Promotion'}
          </Text>
          
          <TextInput
            label="Promotion Name"
            value={formData.name}
            onChangeText={text => setFormData({ ...formData, name: text })}
            style={styles.input}
          />
          
          <TextInput
            label="Description"
            value={formData.description}
            onChangeText={text => setFormData({ ...formData, description: text })}
            style={styles.input}
            multiline
            numberOfLines={3}
          />
          
          <View style={styles.datePickerRow}>
            <Text style={styles.datePickerLabel}>Start Date:</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text>{format(formData.startDate, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
            
            {showStartDatePicker && (
              <DateTimePicker
                value={formData.startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, startDate: selectedDate });
                  }
                }}
              />
            )}
          </View>
          
          <View style={styles.datePickerRow}>
            <Text style={styles.datePickerLabel}>End Date:</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text>{format(formData.endDate, 'MMM d, yyyy')}</Text>
            </TouchableOpacity>
            
            {showEndDatePicker && (
              <DateTimePicker
                value={formData.endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setFormData({ ...formData, endDate: selectedDate });
                  }
                }}
              />
            )}
          </View>
          
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Active:</Text>
            <Switch
              value={formData.isActive}
              onValueChange={value => setFormData({ ...formData, isActive: value })}
            />
          </View>
          
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Priority: {formData.priority}</Text>
            <TextInput
              keyboardType="numeric"
              value={formData.priority.toString()}
              onChangeText={text => {
                const val = parseInt(text) || 0;
                setFormData({ ...formData, priority: Math.min(Math.max(val, 0), 100) });
              }}
              style={styles.numberInput}
            />
          </View>
          
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>Boost Factor: {formData.globalBoostFactor}x</Text>
            <TextInput
              keyboardType="numeric"
              value={formData.globalBoostFactor.toString()}
              onChangeText={text => {
                const val = parseFloat(text) || 1;
                setFormData({ ...formData, globalBoostFactor: Math.min(Math.max(val, 1), 3) });
              }}
              style={styles.numberInput}
            />
          </View>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Boosted Tags</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              label="Add Tag"
              value={tagInput}
              onChangeText={setTagInput}
              style={styles.tagInput}
            />
            <Button 
              mode="contained" 
              onPress={addTag}
              disabled={!tagInput.trim()}
              style={styles.addButton}
            >
              Add
            </Button>
          </View>
          
          <View style={styles.tagsContainer}>
            {formData.boostedTags.map((tag, index) => (
              <Chip
                key={index}
                onClose={() => removeTag(tag)}
                style={styles.chip}
              >
                {tag}
              </Chip>
            ))}
          </View>
          
          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Boosted Content Types</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              label="Add Content Type"
              value={contentTypeInput}
              onChangeText={setContentTypeInput}
              style={styles.tagInput}
            />
            <Button 
              mode="contained" 
              onPress={addContentType}
              disabled={!contentTypeInput.trim()}
              style={styles.addButton}
            >
              Add
            </Button>
          </View>
          
          <View style={styles.tagsContainer}>
            {formData.boostedContentTypes.map((type, index) => (
              <Chip
                key={index}
                onClose={() => removeContentType(type)}
                style={styles.chip}
              >
                {type}
              </Chip>
            ))}
          </View>
          
          <View style={styles.modalActions}>
            <Button 
              mode="outlined" 
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button 
              mode="contained" 
              onPress={currentPromotion ? handleUpdatePromotion : handleCreatePromotion}
              style={styles.modalButton}
              loading={loading}
            >
              {currentPromotion ? 'Update' : 'Create'}
            </Button>
          </View>
        </Modal>
        
        <Modal
          visible={effectivenessModalVisible}
          onDismiss={() => setEffectivenessModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Promotion Effectiveness</Text>
          
          {promotionEffectiveness.length === 0 ? (
            <Text style={styles.emptyText}>No effectiveness data available yet.</Text>
          ) : (
            <FlatList
              data={promotionEffectiveness}
              keyExtractor={(item, index) => item.promotionId || index.toString()}
              renderItem={({ item }) => (
                <Card style={styles.effectivenessCard}>
                  <Card.Content>
                    <Text style={styles.effectivenessTitle}>{item.promotionName}</Text>
                    
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.metrics.impressions}</Text>
                        <Text style={styles.statLabel}>Impressions</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.metrics.clicks}</Text>
                        <Text style={styles.statLabel}>Clicks</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.effectiveness.clickThroughRate?.toFixed(1)}%</Text>
                        <Text style={styles.statLabel}>CTR</Text>
                      </View>
                    </View>
                    
                    <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.metrics.uniqueUsers}</Text>
                        <Text style={styles.statLabel}>Unique Users</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.metrics.saves || 0}</Text>
                        <Text style={styles.statLabel}>Saves</Text>
                      </View>
                      
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{item.metrics.shares || 0}</Text>
                        <Text style={styles.statLabel}>Shares</Text>
                      </View>
                    </View>
                    
                    <View style={styles.engagementScoreContainer}>
                      <Text style={styles.engagementScoreLabel}>Engagement Score:</Text>
                      <Text style={[styles.engagementScoreValue, {
                        color: item.effectiveness.engagementScore > 70 
                          ? theme.colors.success 
                          : item.effectiveness.engagementScore > 40 
                            ? theme.colors.warning 
                            : theme.colors.error
                      }]}>
                        {item.effectiveness.engagementScore || 0}%
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              )}
              style={{ maxHeight: 400 }}
            />
          )}
          
          <Button 
            mode="contained" 
            onPress={() => setEffectivenessModalVisible(false)}
            style={{ marginTop: 16 }}
          >
            Close
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  generateButton: {
    marginLeft: 8,
  },
  effectivenessButton: {
    marginRight: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    padding: 20,
    alignItems: 'center',
  },
  errorText: {
    marginBottom: 12,
    color: 'red',
  },
  listContent: {
    paddingBottom: 80,
  },
  card: {
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  promotionName: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  description: {
    marginBottom: 12,
    opacity: 0.7,
  },
  dateRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  dateLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  dateValue: {
    marginRight: 16,
  },
  priorityRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  priorityLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  priorityValue: {
    marginRight: 16,
  },
  boostLabel: {
    fontWeight: 'bold',
    marginRight: 4,
  },
  boostValue: {
    fontWeight: 'bold',
  },
  tagsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  contentTypeChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
  },
  cardActions: {
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerLabel: {
    width: 100,
    fontSize: 16,
  },
  datePickerButton: {
    flex: 1,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchLabel: {
    width: 100,
    fontSize: 16,
  },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sliderLabel: {
    flex: 1,
    fontSize: 16,
  },
  numberInput: {
    width: 60,
    textAlign: 'center',
  },
  divider: {
    marginVertical: 12,
  },
  tagInputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  tagInput: {
    flex: 1,
    marginRight: 8,
  },
  addButton: {
    justifyContent: 'center',
  },
  chip: {
    margin: 4,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalButton: {
    marginLeft: 8,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  effectivenessCard: {
    marginBottom: 12,
  },
  effectivenessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  engagementScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 12,
    marginTop: 4,
  },
  engagementScoreLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  engagementScoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SeasonalContentManagement; 